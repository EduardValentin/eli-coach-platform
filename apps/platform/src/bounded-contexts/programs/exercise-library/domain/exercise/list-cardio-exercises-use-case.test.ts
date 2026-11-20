import { describe, expect, it } from "vitest";

import { Exercise, type StoredExercise } from "./exercise";
import type { ExerciseLibraryPort } from "./exercise-library-port";
import { ListCardioExercisesUseCase } from "./list-cardio-exercises-use-case";

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

describe("ListCardioExercisesUseCase", () => {
  it("lists only her active cardio exercises", async () => {
    // arrange
    const listCardioExercisesUseCase = new ListCardioExercisesUseCase({
      exerciseLibraryPort: libraryHolding([
        INCLINE_WALK,
        ARCHIVED_BIKE,
        HIP_THRUST,
        OTHER_COACHS_ROWER,
      ]),
    });

    // act
    const exercises =
      await listCardioExercisesUseCase.execute(COACH_ACCOUNT_ID);

    // assert
    expect(exercises.map((exercise) => exercise.name)).toEqual([
      "Incline walk",
    ]);
  });

  it("lists nothing for a coach without a cardio exercise", async () => {
    // arrange
    const listCardioExercisesUseCase = new ListCardioExercisesUseCase({
      exerciseLibraryPort: libraryHolding([HIP_THRUST, OTHER_COACHS_ROWER]),
    });

    // act
    const exercises =
      await listCardioExercisesUseCase.execute(COACH_ACCOUNT_ID);

    // assert
    expect(exercises).toEqual([]);
  });
});
