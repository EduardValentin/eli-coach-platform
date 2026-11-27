import { describe, expect, it } from "vitest";

import { Exercise, type StoredExercise } from "./exercise";
import type { ExerciseLibraryPort } from "./exercise-library-port";
import { ListLibraryExercisesUseCase } from "./list-library-exercises-use-case";

const AT = new Date("2026-10-14T09:00:00.000Z");
const COACH_ACCOUNT_ID = "c0000000-0000-4000-8000-000000000001";
const OTHER_COACH_ACCOUNT_ID = "c0000000-0000-4000-8000-000000000002";

const CARDIO: StoredExercise = {
  id: "e0000000-0000-4000-8000-000000000001",
  ownerAccountId: COACH_ACCOUNT_ID,
  name: "Incline walk",
  type: "cardio",
  unit: "time",
  perSide: false,
  primaryMuscles: [],
  secondaryMuscles: [],
  equipment: [],
  difficulty: "Beginner",
  pattern: null,
  role: null,
  tags: [],
  cues: "",
  video: null,
  archivedAt: null,
  createdAt: AT,
  updatedAt: AT,
};

const INCLINE_WALK = Exercise.reconstitute(CARDIO);

const ARCHIVED_BIKE = Exercise.reconstitute({
  ...CARDIO,
  id: "e0000000-0000-4000-8000-000000000002",
  name: "Bike",
  archivedAt: AT,
});

const HIP_THRUST = Exercise.reconstitute({
  ...CARDIO,
  id: "e0000000-0000-4000-8000-000000000003",
  name: "Hip thrust",
  type: "resistance",
  unit: "reps",
  primaryMuscles: ["Glutes"],
  pattern: "hinge",
  role: "main-compound",
});

const OTHER_COACHS_ROWER = Exercise.reconstitute({
  ...CARDIO,
  id: "e0000000-0000-4000-8000-000000000004",
  ownerAccountId: OTHER_COACH_ACCOUNT_ID,
  name: "Rower",
});

function libraryHolding(
  exercises: Exercise[],
): Pick<ExerciseLibraryPort, "list"> {
  return {
    list: async (ownerAccountId) =>
      exercises.filter(
        (exercise) => exercise.toSnapshot().ownerAccountId === ownerAccountId,
      ),
  };
}

describe("ListLibraryExercisesUseCase", () => {
  it("lists every exercise of hers, archived ones included, with its status", async () => {
    // arrange
    const listLibraryExercisesUseCase = new ListLibraryExercisesUseCase({
      exerciseLibraryPort: libraryHolding([
        INCLINE_WALK,
        ARCHIVED_BIKE,
        HIP_THRUST,
        OTHER_COACHS_ROWER,
      ]),
    });

    // act
    const exercises =
      await listLibraryExercisesUseCase.execute(COACH_ACCOUNT_ID);

    // assert
    expect(exercises).toEqual([
      { ...INCLINE_WALK.toSnapshot(), status: "active" },
      { ...ARCHIVED_BIKE.toSnapshot(), status: "archived" },
      { ...HIP_THRUST.toSnapshot(), status: "active" },
    ]);
  });

  it("lists nothing for a coach without an exercise", async () => {
    // arrange
    const listLibraryExercisesUseCase = new ListLibraryExercisesUseCase({
      exerciseLibraryPort: libraryHolding([OTHER_COACHS_ROWER]),
    });

    // act
    const exercises =
      await listLibraryExercisesUseCase.execute(COACH_ACCOUNT_ID);

    // assert
    expect(exercises).toEqual([]);
  });
});
