import { describe, expect, it, vi } from "vitest";

import { ArchiveExerciseUseCase } from "./archive-exercise-use-case";
import { Exercise, type ExerciseSnapshot } from "./exercise";
import type {
  ExerciseLibrary,
  ExerciseReference,
  ExerciseReplacement,
} from "./exercise-library";

const STORED_AT = new Date("2026-10-13T09:00:00.000Z");
const ARCHIVED_AT = new Date("2026-10-14T09:00:00.000Z");
const NOW = new Date("2026-10-15T09:00:00.000Z");
const COACH_ACCOUNT_ID = "c0000000-0000-4000-8000-000000000001";
const OTHER_COACH_ACCOUNT_ID = "c0000000-0000-4000-8000-000000000002";

const STORED_HIP_THRUST: ExerciseSnapshot = {
  id: "e0000000-0000-4000-8000-000000000001",
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
  archivedAt: null,
  createdAt: STORED_AT,
  updatedAt: STORED_AT,
};

const ARCHIVED_LUNGE = Exercise.reconstitute({
  ...STORED_HIP_THRUST,
  id: "e0000000-0000-4000-8000-000000000002",
  name: "Lunge",
  archivedAt: ARCHIVED_AT,
  updatedAt: ARCHIVED_AT,
});

function createUseCase() {
  const stored = [Exercise.reconstitute(STORED_HIP_THRUST), ARCHIVED_LUNGE];
  const library = {
    find: vi.fn(
      async ({
        ownerAccountId,
        exerciseId,
      }: ExerciseReference): Promise<Exercise | null> =>
        stored.find(
          (exercise) =>
            exercise.id === exerciseId &&
            exercise.toSnapshot().ownerAccountId === ownerAccountId,
        ) ?? null,
    ),
    replace: vi.fn(async (): Promise<ExerciseReplacement> => "replaced"),
  } satisfies Pick<ExerciseLibrary, "find" | "replace">;
  const useCase = new ArchiveExerciseUseCase({
    library,
    clock: { now: () => NOW },
  });

  return { useCase, library };
}

describe("ArchiveExerciseUseCase", () => {
  it("archives her exercise from now on", async () => {
    // arrange
    const { useCase, library } = createUseCase();

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      exerciseId: "e0000000-0000-4000-8000-000000000001",
    });

    // assert
    const archived = Exercise.reconstitute({
      ...STORED_HIP_THRUST,
      archivedAt: NOW,
      updatedAt: NOW,
    });
    expect(result).toEqual({ status: "archived", exercise: archived });
    expect(library.replace).toHaveBeenCalledExactlyOnceWith(archived);
  });

  it("answers an exercise already archived as archived from when it first was", async () => {
    // arrange
    const { useCase } = createUseCase();

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      exerciseId: "e0000000-0000-4000-8000-000000000002",
    });

    // assert
    expect(result).toEqual({ status: "archived", exercise: ARCHIVED_LUNGE });
  });

  it("finds nothing to archive for an unknown exercise", async () => {
    // arrange
    const { useCase, library } = createUseCase();

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      exerciseId: "e0000000-0000-4000-8000-000000000404",
    });

    // assert
    expect(result).toEqual({ status: "not-found" });
    expect(library.replace).not.toHaveBeenCalled();
  });

  it("finds nothing to archive in another coach's library", async () => {
    // arrange
    const { useCase, library } = createUseCase();

    // act
    const result = await useCase.execute({
      ownerAccountId: OTHER_COACH_ACCOUNT_ID,
      exerciseId: "e0000000-0000-4000-8000-000000000001",
    });

    // assert
    expect(result).toEqual({ status: "not-found" });
    expect(library.replace).not.toHaveBeenCalled();
  });
});
