import { describe, expect, it, vi } from "vitest";

import { Exercise } from "./exercise";
import type { ExerciseLibrary } from "./exercise-library";
import { ListExercisesUseCase } from "./list-exercises-use-case";

const AT = new Date("2026-10-14T09:00:00.000Z");

const HIP_THRUST = Exercise.reconstitute({
  id: "exercise-1",
  name: "Hip thrust",
  type: "resistance",
  unit: "reps",
  perSide: false,
  primaryMuscles: ["Glutes"],
  secondaryMuscles: [],
  equipment: ["Barbell", "Bench"],
  difficulty: "Beginner",
  tags: ["Hypertrophy"],
  cues: "",
  createdAt: AT,
  updatedAt: AT,
});

describe("ListExercisesUseCase", () => {
  it("lists every exercise in the order the library keeps them", async () => {
    // arrange
    const library = {
      list: vi.fn(async () => [HIP_THRUST]),
      find: vi.fn(),
      add: vi.fn(),
      replace: vi.fn(),
    } satisfies ExerciseLibrary;
    const useCase = new ListExercisesUseCase({ library });

    // act
    const result = await useCase.execute();

    // assert
    expect(result).toEqual({ status: "listed", exercises: [HIP_THRUST] });
  });
});
