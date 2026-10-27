import { describe, expect, it, vi } from "vitest";

import { Exercise } from "./exercise";
import type { ExerciseLibrary } from "./exercise-library";
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
    archivedAt: null,
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
const ARCHIVED_DEADLIFT = exerciseCalled(
  "e0000000-0000-4000-8000-000000000005",
  "Deadlift",
).archived(AT);
const OTHER_COACHS_PLANK = Exercise.reconstitute({
  ...exerciseCalled(
    "e0000000-0000-4000-8000-000000000004",
    "Plank",
  ).toSnapshot(),
  ownerAccountId: OTHER_COACH_ACCOUNT_ID,
});

function createUseCase() {
  const stored = [
    BACK_SQUAT,
    ARCHIVED_DEADLIFT,
    HIP_THRUST,
    LUNGE,
    OTHER_COACHS_PLANK,
  ];
  const ownedBy = (ownerAccountId: string) =>
    stored.filter(
      (exercise) => exercise.toSnapshot().ownerAccountId === ownerAccountId,
    );
  const library = {
    list: vi.fn(async (ownerAccountId: string) => ownedBy(ownerAccountId)),
  } satisfies Pick<ExerciseLibrary, "list">;

  return { useCase: new FindExerciseUseCase({ library }), library };
}

describe("FindExerciseUseCase", () => {
  it("finds her exercise in one read of her library, with the names of her other active exercises, its own left out", async () => {
    // arrange
    const { useCase, library } = createUseCase();

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
    expect(library.list).toHaveBeenCalledOnce();
  });

  it("answers an archived exercise as archived", async () => {
    // arrange
    const { useCase } = createUseCase();

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      exerciseId: "e0000000-0000-4000-8000-000000000005",
    });

    // assert
    expect(result).toEqual({ status: "archived" });
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
