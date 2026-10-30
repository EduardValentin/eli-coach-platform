import { describe, expect, it, vi } from "vitest";

import { Exercise } from "./exercise";
import type { ExerciseLibraryPort } from "./exercise-library-port";
import { ListExercisesUseCase } from "./list-exercises-use-case";

const AT = new Date("2026-10-14T09:00:00.000Z");
const COACH_ACCOUNT_ID = "c0000000-0000-4000-8000-000000000001";

const HIP_THRUST = Exercise.reconstitute({
  id: "e0000000-0000-4000-8000-000000000001",
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
  archivedAt: null,
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
      remove: vi.fn(),
    } satisfies ExerciseLibraryPort;
    const listExercisesUseCase = new ListExercisesUseCase({
      exerciseLibraryPort: library,
    });

    // act
    const result = await listExercisesUseCase.execute(COACH_ACCOUNT_ID);

    // assert
    expect(result).toEqual({ status: "listed", exercises: [HIP_THRUST] });
    expect(library.list).toHaveBeenCalledWith(COACH_ACCOUNT_ID);
  });
});
