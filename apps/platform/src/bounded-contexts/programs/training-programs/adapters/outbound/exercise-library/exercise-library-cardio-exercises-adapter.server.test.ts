import { describe, expect, it } from "vitest";

import type {
  CardioExercisesFacade,
  CardioExerciseView,
} from "~/bounded-contexts/programs/exercise-library/public/cardio-exercises-facade";

import { ExerciseLibraryCardioExercisesAdapter } from "./exercise-library-cardio-exercises-adapter.server";

class CardioExercisesFacadeDouble implements CardioExercisesFacade {
  constructor(
    private readonly exercisesByCoach: Record<string, CardioExerciseView[]>,
  ) {}

  async listCardioExercises(
    ownerAccountId: string,
  ): Promise<CardioExerciseView[]> {
    return this.exercisesByCoach[ownerAccountId] ?? [];
  }
}

describe("ExerciseLibraryCardioExercisesAdapter", () => {
  it("translates the coach's cardio exercises, in the library's order", async () => {
    // arrange
    const exerciseLibraryCardioExercisesAdapter =
      new ExerciseLibraryCardioExercisesAdapter(
        new CardioExercisesFacadeDouble({
          "coach-account-1": [
            { exerciseId: "exercise-2", name: "Rowing machine" },
            { exerciseId: "exercise-1", name: "Stationary bike" },
          ],
          "coach-account-2": [{ exerciseId: "exercise-3", name: "Treadmill" }],
        }),
      );

    // act
    const cardioExercises =
      await exerciseLibraryCardioExercisesAdapter.listFor("coach-account-1");

    // assert
    expect(cardioExercises).toEqual([
      { id: "exercise-2", name: "Rowing machine" },
      { id: "exercise-1", name: "Stationary bike" },
    ]);
  });

  it("answers none for a coach without cardio exercises", async () => {
    // arrange
    const exerciseLibraryCardioExercisesAdapter =
      new ExerciseLibraryCardioExercisesAdapter(
        new CardioExercisesFacadeDouble({}),
      );

    // act
    const cardioExercises =
      await exerciseLibraryCardioExercisesAdapter.listFor("coach-account-1");

    // assert
    expect(cardioExercises).toEqual([]);
  });
});
