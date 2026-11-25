import { describe, expect, it, vi } from "vitest";

import { Exercise, type StoredExercise } from "./exercise";
import type {
  ExerciseLibraryPort,
  ExerciseVersionUsage,
} from "./exercise-library-port";
import { RecordExerciseUsageUseCase } from "./record-exercise-usage-use-case";

const AT = new Date("2026-10-14T09:00:00.000Z");
const COACH_ACCOUNT_ID = "c0000000-0000-4000-8000-000000000001";
const OTHER_COACH_ACCOUNT_ID = "c0000000-0000-4000-8000-000000000002";
const PROGRAM_ID = "a0000000-0000-4000-8000-000000000001";
const HIP_THRUST_ID = "e0000000-0000-4000-8000-000000000001";
const ARCHIVED_BIKE_ID = "e0000000-0000-4000-8000-000000000002";
const OTHER_COACHS_ROWER_ID = "e0000000-0000-4000-8000-000000000003";
const UNKNOWN_ID = "e0000000-0000-4000-8000-000000000404";

const HIP_THRUST: StoredExercise = {
  id: HIP_THRUST_ID,
  ownerAccountId: COACH_ACCOUNT_ID,
  name: "Hip thrust",
  type: "resistance",
  unit: "reps",
  perSide: false,
  primaryMuscles: ["Glutes"],
  secondaryMuscles: [],
  equipment: ["Barbell"],
  difficulty: "Beginner",
  pattern: "hinge",
  role: "main-compound",
  tags: [],
  cues: "",
  video: null,
  archivedAt: null,
  createdAt: AT,
  updatedAt: AT,
};

const BIKE: StoredExercise = {
  ...HIP_THRUST,
  id: ARCHIVED_BIKE_ID,
  name: "Bike",
  type: "cardio",
  unit: "time",
  primaryMuscles: [],
  pattern: null,
  role: null,
  archivedAt: AT,
};

const OTHER_COACHS_ROWER: StoredExercise = {
  ...BIKE,
  id: OTHER_COACHS_ROWER_ID,
  ownerAccountId: OTHER_COACH_ACCOUNT_ID,
  name: "Rower",
  archivedAt: null,
};

function createUseCase() {
  const stored = [HIP_THRUST, BIKE, OTHER_COACHS_ROWER].map((exercise) =>
    Exercise.reconstitute(exercise),
  );
  const library = {
    list: vi.fn(async (ownerAccountId: string) =>
      stored.filter(
        (exercise) => exercise.toSnapshot().ownerAccountId === ownerAccountId,
      ),
    ),
    replaceVersionUsage: vi.fn(
      async (_usage: ExerciseVersionUsage) => undefined,
    ),
  } satisfies Pick<ExerciseLibraryPort, "list" | "replaceVersionUsage">;
  const recordExerciseUsageUseCase = new RecordExerciseUsageUseCase({
    exerciseLibraryPort: library,
  });

  return { recordExerciseUsageUseCase, library };
}

describe("RecordExerciseUsageUseCase", () => {
  it("records the exercises of hers a program version uses, an archived one included", async () => {
    // arrange
    const { recordExerciseUsageUseCase, library } = createUseCase();

    // act
    const result = await recordExerciseUsageUseCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      programId: PROGRAM_ID,
      versionNumber: 2,
      exerciseIds: [HIP_THRUST_ID, ARCHIVED_BIKE_ID],
    });

    // assert
    expect(result).toEqual({ status: "recorded" });
    expect(library.replaceVersionUsage).toHaveBeenCalledExactlyOnceWith({
      programId: PROGRAM_ID,
      versionNumber: 2,
      exerciseIds: [HIP_THRUST_ID, ARCHIVED_BIKE_ID],
    });
  });

  it("records an exercise the version uses in several places once", async () => {
    // arrange
    const { recordExerciseUsageUseCase, library } = createUseCase();

    // act
    await recordExerciseUsageUseCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      programId: PROGRAM_ID,
      versionNumber: 1,
      exerciseIds: [HIP_THRUST_ID, HIP_THRUST_ID],
    });

    // assert
    expect(library.replaceVersionUsage).toHaveBeenCalledExactlyOnceWith({
      programId: PROGRAM_ID,
      versionNumber: 1,
      exerciseIds: [HIP_THRUST_ID],
    });
  });

  it("records that a version using no exercise uses none", async () => {
    // arrange
    const { recordExerciseUsageUseCase, library } = createUseCase();

    // act
    const result = await recordExerciseUsageUseCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      programId: PROGRAM_ID,
      versionNumber: 1,
      exerciseIds: [],
    });

    // assert
    expect(result).toEqual({ status: "recorded" });
    expect(library.replaceVersionUsage).toHaveBeenCalledExactlyOnceWith({
      programId: PROGRAM_ID,
      versionNumber: 1,
      exerciseIds: [],
    });
  });

  it.each([
    ["another coach's exercise", OTHER_COACHS_ROWER_ID],
    ["an unknown exercise", UNKNOWN_ID],
  ])("refuses %s and records nothing", async (_case, exerciseId) => {
    // arrange
    const { recordExerciseUsageUseCase, library } = createUseCase();

    // act
    const result = await recordExerciseUsageUseCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      programId: PROGRAM_ID,
      versionNumber: 1,
      exerciseIds: [HIP_THRUST_ID, exerciseId],
    });

    // assert
    expect(result).toEqual({ status: "unknown-exercise" });
    expect(library.replaceVersionUsage).not.toHaveBeenCalled();
  });
});
