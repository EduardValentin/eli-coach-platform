import { describe, expect, it, vi } from "vitest";

import { Exercise } from "./exercise";
import type { ExerciseLibrary } from "./exercise-library";
import { FindExerciseUseCase } from "./find-exercise-use-case";

const AT = new Date("2026-10-14T09:00:00.000Z");

function exerciseCalled(id: string, name: string): Exercise {
  return Exercise.reconstitute({
    id,
    name,
    type: "resistance",
    unit: "reps",
    perSide: false,
    primaryMuscles: ["Glutes"],
    secondaryMuscles: [],
    equipment: [],
    difficulty: "Beginner",
    tags: [],
    cues: "",
    createdAt: AT,
    updatedAt: AT,
  });
}

const HIP_THRUST = exerciseCalled("exercise-1", "Hip thrust");
const BACK_SQUAT = exerciseCalled("exercise-2", "Back squat");
const LUNGE = exerciseCalled("exercise-3", "Lunge");

function createUseCase() {
  const stored = [BACK_SQUAT, HIP_THRUST, LUNGE];
  const library = {
    list: vi.fn(async () => stored),
    find: vi.fn(
      async (exerciseId: string) =>
        stored.find(({ id }) => id === exerciseId) ?? null,
    ),
    add: vi.fn(),
    replace: vi.fn(),
  } satisfies ExerciseLibrary;

  return { useCase: new FindExerciseUseCase({ library }), library };
}

describe("FindExerciseUseCase", () => {
  it("finds the exercise with the names of every other exercise, its own left out", async () => {
    // arrange
    const { useCase } = createUseCase();

    // act
    const result = await useCase.execute("exercise-1");

    // assert
    expect(result).toEqual({
      status: "found",
      exercise: HIP_THRUST,
      otherNames: ["Back squat", "Lunge"],
    });
  });

  it("finds nothing for an unknown exercise", async () => {
    // arrange
    const { useCase } = createUseCase();

    // act
    const result = await useCase.execute("exercise-404");

    // assert
    expect(result).toEqual({ status: "not-found" });
  });
});
