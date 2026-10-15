import { describe, expect, it, vi } from "vitest";

import { CreateExerciseUseCase } from "./create-exercise-use-case";
import { Exercise } from "./exercise";
import type { ExerciseDraftInput } from "./exercise-draft";
import type { ExerciseAddition, ExerciseLibrary } from "./exercise-library";
import type { ExerciseLibraryIncidents } from "./exercise-library-incidents";

const STORED_AT = new Date("2026-10-13T09:00:00.000Z");
const NOW = new Date("2026-10-14T09:00:00.000Z");
const COACH_ACCOUNT_ID = "coach-account-1";
const OTHER_COACH_ACCOUNT_ID = "coach-account-2";

const HIP_THRUST = Exercise.reconstitute({
  id: "exercise-1",
  ownerAccountId: COACH_ACCOUNT_ID,
  name: "Hip thrust",
  type: "resistance",
  unit: "reps",
  perSide: false,
  primaryMuscles: ["Glutes"],
  secondaryMuscles: [],
  equipment: ["Barbell"],
  difficulty: "Beginner",
  tags: [],
  cues: "",
  createdAt: STORED_AT,
  updatedAt: STORED_AT,
});

const OTHER_COACHS_PLANK = Exercise.reconstitute({
  ...HIP_THRUST.toSnapshot(),
  id: "exercise-3",
  ownerAccountId: OTHER_COACH_ACCOUNT_ID,
  name: "Plank",
});

const SQUAT: ExerciseDraftInput = {
  name: "  Back squat ",
  type: "resistance",
  unit: "reps",
  perSide: false,
  primaryMuscles: ["Quadriceps", "Glutes"],
  secondaryMuscles: ["Core"],
  equipment: ["Barbell", "Squat rack"],
  difficulty: "Intermediate",
  tags: ["Strength"],
  cues: "Brace.",
};

function createUseCase() {
  const stored = [HIP_THRUST, OTHER_COACHS_PLANK];
  const library = {
    list: vi.fn(async (ownerAccountId: string): Promise<Exercise[]> =>
      stored.filter(
        (exercise) => exercise.toSnapshot().ownerAccountId === ownerAccountId,
      ),
    ),
    find: vi.fn(),
    add: vi.fn(async (): Promise<ExerciseAddition> => "added"),
    replace: vi.fn(),
  } satisfies ExerciseLibrary;
  const incidents = {
    exerciseCreationFailed: vi.fn(),
    exerciseEditFailed: vi.fn(),
  } satisfies ExerciseLibraryIncidents;
  const useCase = new CreateExerciseUseCase({
    library,
    ids: { generate: () => "exercise-2" },
    clock: { now: () => NOW },
    incidents,
  });

  return { useCase, library, incidents };
}

describe("CreateExerciseUseCase", () => {
  it("adds the exercise under a new id, owned by the coach who created it, its name trimmed, created now", async () => {
    // arrange
    const { useCase, library } = createUseCase();

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      draft: SQUAT,
    });

    // assert
    const created = Exercise.reconstitute({
      ...SQUAT,
      id: "exercise-2",
      ownerAccountId: COACH_ACCOUNT_ID,
      name: "Back squat",
      type: "resistance",
      unit: "reps",
      primaryMuscles: ["Quadriceps", "Glutes"],
      secondaryMuscles: ["Core"],
      equipment: ["Barbell", "Squat rack"],
      difficulty: "Intermediate",
      tags: ["Strength"],
      createdAt: NOW,
      updatedAt: NOW,
    });
    expect(result).toEqual({ status: "created", exercise: created });
    expect(library.add).toHaveBeenCalledWith(created);
  });

  it("refuses a draft that breaks a rule, naming each problem, without adding it", async () => {
    // arrange
    const { useCase, library } = createUseCase();

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      draft: { ...SQUAT, name: " ", primaryMuscles: [] },
    });

    // assert
    expect(result).toEqual({
      status: "invalid",
      problems: { name: "missing", primaryMuscles: "missing" },
    });
    expect(library.add).not.toHaveBeenCalled();
  });

  it("refuses a name another of her exercises already has, whatever its case and spaces, without adding it", async () => {
    // arrange
    const { useCase, library } = createUseCase();

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      draft: { ...SQUAT, name: " HIP thrust  " },
    });

    // assert
    expect(result).toEqual({ status: "invalid", problems: { name: "taken" } });
    expect(library.add).not.toHaveBeenCalled();
  });

  it("adds a name only another coach's exercise has", async () => {
    // arrange
    const { useCase, library } = createUseCase();

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      draft: { ...SQUAT, name: "plank" },
    });

    // assert
    expect(result.status).toBe("created");
    expect(library.add).toHaveBeenCalledOnce();
  });

  it("refuses the name when the library finds it taken by an exercise added meanwhile", async () => {
    // arrange
    const { useCase, library } = createUseCase();
    library.add.mockResolvedValueOnce("name-taken");

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      draft: SQUAT,
    });

    // assert
    expect(result).toEqual({ status: "invalid", problems: { name: "taken" } });
  });

  it("reports a failed read of the other names and answers that the creation failed without adding it", async () => {
    // arrange
    const failure = new Error("connection terminated");
    const { useCase, library, incidents } = createUseCase();
    library.list.mockRejectedValueOnce(failure);

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      draft: SQUAT,
    });

    // assert
    expect(result).toEqual({ status: "failed" });
    expect(library.add).not.toHaveBeenCalled();
    expect(incidents.exerciseCreationFailed).toHaveBeenCalledWith({
      error: failure,
    });
  });

  it("reports a failed write and answers that the creation failed", async () => {
    // arrange
    const failure = new Error("connection terminated");
    const { useCase, library, incidents } = createUseCase();
    library.add.mockRejectedValueOnce(failure);

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      draft: SQUAT,
    });

    // assert
    expect(result).toEqual({ status: "failed" });
    expect(incidents.exerciseCreationFailed).toHaveBeenCalledWith({
      error: failure,
    });
  });
});
