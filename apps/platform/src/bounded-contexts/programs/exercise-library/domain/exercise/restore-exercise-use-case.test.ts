import { describe, expect, it, vi } from "vitest";

import { Exercise, type ExerciseSnapshot } from "./exercise";
import type {
  ExerciseLibraryPort,
  ExerciseReplacement,
} from "./exercise-library-port";
import type { ExerciseLibraryIncidentsPort } from "./exercise-library-incidents-port";
import { RestoreExerciseUseCase } from "./restore-exercise-use-case";

const STORED_AT = new Date("2026-10-13T09:00:00.000Z");
const ARCHIVED_AT = new Date("2026-10-14T09:00:00.000Z");
const NOW = new Date("2026-10-15T09:00:00.000Z");
const COACH_ACCOUNT_ID = "c0000000-0000-4000-8000-000000000001";
const OTHER_COACH_ACCOUNT_ID = "c0000000-0000-4000-8000-000000000002";
const ARCHIVED_HIP_THRUST_ID = "e0000000-0000-4000-8000-000000000001";
const ARCHIVED_LUNGE_ID = "e0000000-0000-4000-8000-000000000003";

const ARCHIVED_HIP_THRUST: ExerciseSnapshot = {
  id: ARCHIVED_HIP_THRUST_ID,
  ownerAccountId: COACH_ACCOUNT_ID,
  name: "Hip thrust",
  type: "resistance",
  unit: "reps",
  perSide: false,
  primaryMuscles: ["Glutes"],
  secondaryMuscles: [],
  equipment: ["Barbell"],
  difficulty: "Beginner",
  tags: [],
  cues: "",
  video: null,
  archivedAt: ARCHIVED_AT,
  createdAt: STORED_AT,
  updatedAt: ARCHIVED_AT,
};

const ACTIVE_HIP_THRUST = Exercise.reconstitute({
  ...ARCHIVED_HIP_THRUST,
  id: "e0000000-0000-4000-8000-000000000002",
  archivedAt: null,
  updatedAt: STORED_AT,
});

const ARCHIVED_LUNGE: ExerciseSnapshot = {
  ...ARCHIVED_HIP_THRUST,
  id: ARCHIVED_LUNGE_ID,
  name: "Lunge",
};

const ARCHIVED_NUMBERED_HIP_THRUST = Exercise.reconstitute({
  ...ARCHIVED_HIP_THRUST,
  id: "e0000000-0000-4000-8000-000000000004",
  name: "Hip thrust (2)",
});

const OTHER_COACHS_PLANK = Exercise.reconstitute({
  ...ARCHIVED_HIP_THRUST,
  id: "e0000000-0000-4000-8000-000000000005",
  ownerAccountId: OTHER_COACH_ACCOUNT_ID,
  name: "Plank",
});

function restoredAs(snapshot: ExerciseSnapshot, name: string): Exercise {
  return Exercise.reconstitute({
    ...snapshot,
    name,
    archivedAt: null,
    updatedAt: NOW,
  });
}

function createUseCase() {
  const stored = [
    Exercise.reconstitute(ARCHIVED_HIP_THRUST),
    ACTIVE_HIP_THRUST,
    Exercise.reconstitute(ARCHIVED_LUNGE),
    ARCHIVED_NUMBERED_HIP_THRUST,
    OTHER_COACHS_PLANK,
  ];
  const library = {
    list: vi.fn(async (ownerAccountId: string): Promise<Exercise[]> =>
      stored.filter(
        (exercise) => exercise.toSnapshot().ownerAccountId === ownerAccountId,
      ),
    ),
    replace: vi.fn(
      async (_exercise: Exercise): Promise<ExerciseReplacement> => "replaced",
    ),
  } satisfies Pick<ExerciseLibraryPort, "list" | "replace">;
  const incidents = {
    exerciseRestoreFailed: vi.fn(),
  } satisfies Pick<ExerciseLibraryIncidentsPort, "exerciseRestoreFailed">;
  const restoreExerciseUseCase = new RestoreExerciseUseCase({
    exerciseLibraryPort: library,
    clockPort: { now: () => NOW },
    exerciseLibraryIncidentsPort: incidents,
  });

  return { restoreExerciseUseCase, library, incidents };
}

describe("RestoreExerciseUseCase", () => {
  it("restores her archived exercise under its own name when no active exercise holds it", async () => {
    // arrange
    const { restoreExerciseUseCase, library } = createUseCase();

    // act
    const result = await restoreExerciseUseCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      exerciseId: ARCHIVED_LUNGE_ID,
    });

    // assert
    const restored = restoredAs(ARCHIVED_LUNGE, "Lunge");
    expect(result).toEqual({ status: "restored", exercise: restored });
    expect(library.replace).toHaveBeenCalledExactlyOnceWith(restored);
  });

  it("restores it numbered when an active exercise now holds its name, archived names left free", async () => {
    // arrange
    const { restoreExerciseUseCase, library } = createUseCase();

    // act
    const result = await restoreExerciseUseCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      exerciseId: ARCHIVED_HIP_THRUST_ID,
    });

    // assert
    const restored = restoredAs(ARCHIVED_HIP_THRUST, "Hip thrust (2)");
    expect(result).toEqual({ status: "restored", exercise: restored });
    expect(library.replace).toHaveBeenCalledExactlyOnceWith(restored);
  });

  it("tries the next number when the library finds the name taken meanwhile", async () => {
    // arrange
    const { restoreExerciseUseCase, library } = createUseCase();
    library.replace.mockResolvedValueOnce("name-taken");

    // act
    const result = await restoreExerciseUseCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      exerciseId: ARCHIVED_HIP_THRUST_ID,
    });

    // assert
    const restored = restoredAs(ARCHIVED_HIP_THRUST, "Hip thrust (3)");
    expect(result).toEqual({ status: "restored", exercise: restored });
    expect(library.replace).toHaveBeenNthCalledWith(
      1,
      restoredAs(ARCHIVED_HIP_THRUST, "Hip thrust (2)"),
    );
    expect(library.replace).toHaveBeenNthCalledWith(2, restored);
  });

  it("reports and answers failed once five names in a row are found taken", async () => {
    // arrange
    const { restoreExerciseUseCase, library, incidents } = createUseCase();
    library.replace.mockResolvedValue("name-taken");

    // act
    const result = await restoreExerciseUseCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      exerciseId: ARCHIVED_HIP_THRUST_ID,
    });

    // assert
    expect(result).toEqual({ status: "failed" });
    expect(
      library.replace.mock.calls.map(([exercise]) => exercise.name),
    ).toEqual([
      "Hip thrust (2)",
      "Hip thrust (3)",
      "Hip thrust (4)",
      "Hip thrust (5)",
      "Hip thrust (6)",
    ]);
    expect(incidents.exerciseRestoreFailed).toHaveBeenCalledExactlyOnceWith({
      exerciseId: ARCHIVED_HIP_THRUST_ID,
      error: expect.any(Error),
    });
  });

  it("reports a failed write and answers that the restore failed", async () => {
    // arrange
    const failure = new Error("connection terminated");
    const { restoreExerciseUseCase, library, incidents } = createUseCase();
    library.replace.mockRejectedValueOnce(failure);

    // act
    const result = await restoreExerciseUseCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      exerciseId: ARCHIVED_LUNGE_ID,
    });

    // assert
    expect(result).toEqual({ status: "failed" });
    expect(incidents.exerciseRestoreFailed).toHaveBeenCalledWith({
      exerciseId: ARCHIVED_LUNGE_ID,
      error: failure,
    });
  });

  it("finds nothing to restore for an unknown exercise", async () => {
    // arrange
    const { restoreExerciseUseCase, library } = createUseCase();

    // act
    const result = await restoreExerciseUseCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      exerciseId: "e0000000-0000-4000-8000-000000000404",
    });

    // assert
    expect(result).toEqual({ status: "not-found" });
    expect(library.replace).not.toHaveBeenCalled();
  });

  it("finds nothing to restore in another coach's library", async () => {
    // arrange
    const { restoreExerciseUseCase, library } = createUseCase();

    // act
    const result = await restoreExerciseUseCase.execute({
      ownerAccountId: OTHER_COACH_ACCOUNT_ID,
      exerciseId: ARCHIVED_LUNGE_ID,
    });

    // assert
    expect(result).toEqual({ status: "not-found" });
    expect(library.replace).not.toHaveBeenCalled();
  });
});
