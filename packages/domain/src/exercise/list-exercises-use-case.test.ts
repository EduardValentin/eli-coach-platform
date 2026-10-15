import { describe, expect, it, vi } from "vitest";

import { Exercise } from "./exercise";
import type { ExerciseLibrary } from "./exercise-library";
import { ListExercisesUseCase } from "./list-exercises-use-case";

const AT = new Date("2026-10-14T09:00:00.000Z");
const COACH_ACCOUNT_ID = "coach-account-1";

const HIP_THRUST = Exercise.reconstitute({
  id: "exercise-1",
  ownerAccountId: COACH_ACCOUNT_ID,
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
  video: null,
  createdAt: AT,
  updatedAt: AT,
});

describe("ListExercisesUseCase", () => {
  it("lists every exercise of hers in the order the library keeps them", async () => {
    // arrange
    const library = {
      list: vi.fn(async () => [HIP_THRUST]),
      find: vi.fn(),
      add: vi.fn(),
      replace: vi.fn(),
    } satisfies ExerciseLibrary;
    const useCase = new ListExercisesUseCase({ library });

    // act
    const result = await useCase.execute(COACH_ACCOUNT_ID);

    // assert
    expect(result).toEqual({ status: "listed", exercises: [HIP_THRUST] });
    expect(library.list).toHaveBeenCalledWith(COACH_ACCOUNT_ID);
  });
});
