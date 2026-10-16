import { describe, expect, it, vi } from "vitest";

import { Exercise } from "./exercise";
import type { ExerciseLibrary, ExerciseReference } from "./exercise-library";
import { FindExerciseUseCase } from "./find-exercise-use-case";

const AT = new Date("2026-10-14T09:00:00.000Z");
const COACH_ACCOUNT_ID = "c0000000-0000-4000-8000-000000000001";
const OTHER_COACH_ACCOUNT_ID = "c0000000-0000-4000-8000-000000000002";

function exerciseCalled(id: string, name: string): Exercise {
  return Exercise.reconstitute({
    id,
    ownerAccountId: COACH_ACCOUNT_ID,
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
    video: null,
    createdAt: AT,
    updatedAt: AT,
  });
}

const HIP_THRUST = exerciseCalled(
  "e0000000-0000-4000-8000-000000000001",
  "Hip thrust",
);
const BACK_SQUAT = exerciseCalled(
  "e0000000-0000-4000-8000-000000000002",
  "Back squat",
);
const LUNGE = exerciseCalled("e0000000-0000-4000-8000-000000000003", "Lunge");
const OTHER_COACHS_PLANK = Exercise.reconstitute({
  ...exerciseCalled(
    "e0000000-0000-4000-8000-000000000004",
    "Plank",
  ).toSnapshot(),
  ownerAccountId: OTHER_COACH_ACCOUNT_ID,
});

function createUseCase() {
  const stored = [BACK_SQUAT, HIP_THRUST, LUNGE, OTHER_COACHS_PLANK];
  const ownedBy = (ownerAccountId: string) =>
    stored.filter(
      (exercise) => exercise.toSnapshot().ownerAccountId === ownerAccountId,
    );
  const library = {
    list: vi.fn(async (ownerAccountId: string) => ownedBy(ownerAccountId)),
    find: vi.fn(
      async ({ ownerAccountId, exerciseId }: ExerciseReference) =>
        ownedBy(ownerAccountId).find(({ id }) => id === exerciseId) ?? null,
    ),
    add: vi.fn(),
    replace: vi.fn(),
  } satisfies ExerciseLibrary;

  return { useCase: new FindExerciseUseCase({ library }), library };
}

describe("FindExerciseUseCase", () => {
  it("finds her exercise with the names of every other exercise of hers, its own left out", async () => {
    // arrange
    const { useCase } = createUseCase();

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      exerciseId: "e0000000-0000-4000-8000-000000000001",
    });

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
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      exerciseId: "e0000000-0000-4000-8000-000000000404",
    });

    // assert
    expect(result).toEqual({ status: "not-found" });
  });

  it("finds nothing for another coach's exercise", async () => {
    // arrange
    const { useCase } = createUseCase();

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      exerciseId: "e0000000-0000-4000-8000-000000000004",
    });

    // assert
    expect(result).toEqual({ status: "not-found" });
  });
});
