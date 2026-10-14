import { describe, expect, it, vi } from "vitest";

import { EditExerciseUseCase } from "./edit-exercise-use-case";
import { Exercise, type ExerciseSnapshot } from "./exercise";
import type { ExerciseDraftInput } from "./exercise-draft";
import type { ExerciseLibrary, ExerciseReplacement } from "./exercise-library";
import type { ExerciseLibraryIncidents } from "./exercise-library-incidents";

const CREATED_AT = new Date("2026-10-13T09:00:00.000Z");
const NOW = new Date("2026-10-14T09:00:00.000Z");

const STORED_SQUAT: ExerciseSnapshot = {
  id: "exercise-1",
  name: "Back squat",
  type: "resistance",
  unit: "reps",
  perSide: false,
  primaryMuscles: ["Quadriceps"],
  secondaryMuscles: [],
  equipment: ["Barbell"],
  difficulty: "Beginner",
  tags: [],
  cues: "",
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
};

const HIP_THRUST = Exercise.reconstitute({
  ...STORED_SQUAT,
  id: "exercise-2",
  name: "Hip thrust",
  primaryMuscles: ["Glutes"],
});

const SQUAT_REVISED: ExerciseDraftInput = {
  name: " Front squat ",
  type: "mobility",
  unit: "time",
  perSide: true,
  primaryMuscles: ["Quadriceps", "Core"],
  secondaryMuscles: ["Glutes"],
  equipment: [],
  difficulty: "Advanced",
  tags: ["Strength", "Recovery"],
  cues: "Elbows high.",
};

function createUseCase() {
  const stored = [Exercise.reconstitute(STORED_SQUAT), HIP_THRUST];
  const library = {
    list: vi.fn(async (): Promise<Exercise[]> => stored),
    find: vi.fn(
      async (exerciseId: string): Promise<Exercise | null> =>
        stored.find(({ id }) => id === exerciseId) ?? null,
    ),
    add: vi.fn(),
    replace: vi.fn(async (): Promise<ExerciseReplacement> => "replaced"),
  } satisfies ExerciseLibrary;
  const incidents = {
    exerciseCreationFailed: vi.fn(),
    exerciseEditFailed: vi.fn(),
  } satisfies ExerciseLibraryIncidents;
  const useCase = new EditExerciseUseCase({
    library,
    clock: { now: () => NOW },
    incidents,
  });

  return { useCase, library, incidents };
}

describe("EditExerciseUseCase", () => {
  it("replaces the whole exercise, its name trimmed, keeping its id and the moment it was created", async () => {
    // arrange
    const { useCase, library } = createUseCase();

    // act
    const result = await useCase.execute({
      exerciseId: "exercise-1",
      draft: SQUAT_REVISED,
    });

    // assert
    const edited = Exercise.reconstitute({
      id: "exercise-1",
      name: "Front squat",
      type: "mobility",
      unit: "time",
      perSide: true,
      primaryMuscles: ["Quadriceps", "Core"],
      secondaryMuscles: ["Glutes"],
      equipment: [],
      difficulty: "Advanced",
      tags: ["Strength", "Recovery"],
      cues: "Elbows high.",
      createdAt: CREATED_AT,
      updatedAt: NOW,
    });
    expect(result).toEqual({ status: "edited", exercise: edited });
    expect(library.replace).toHaveBeenCalledWith(edited);
  });

  it("keeps its own name, whatever its case and spaces", async () => {
    // arrange
    const { useCase, library } = createUseCase();

    // act
    const result = await useCase.execute({
      exerciseId: "exercise-1",
      draft: { ...SQUAT_REVISED, name: " back SQUAT " },
    });

    // assert
    expect(result.status).toBe("edited");
    expect(library.replace).toHaveBeenCalledOnce();
  });

  it("refuses a rename onto another exercise's name without replacing it", async () => {
    // arrange
    const { useCase, library } = createUseCase();

    // act
    const result = await useCase.execute({
      exerciseId: "exercise-1",
      draft: { ...SQUAT_REVISED, name: "hip THRUST" },
    });

    // assert
    expect(result).toEqual({ status: "invalid", problems: { name: "taken" } });
    expect(library.replace).not.toHaveBeenCalled();
  });

  it("refuses a draft that breaks a rule without replacing it", async () => {
    // arrange
    const { useCase, library } = createUseCase();

    // act
    const result = await useCase.execute({
      exerciseId: "exercise-1",
      draft: { ...SQUAT_REVISED, type: "stretching", unit: "reps" },
    });

    // assert
    expect(result).toEqual({
      status: "invalid",
      problems: { unit: "not-allowed" },
    });
    expect(library.replace).not.toHaveBeenCalled();
  });

  it("refuses the name when the library finds it taken by an exercise renamed meanwhile", async () => {
    // arrange
    const { useCase, library } = createUseCase();
    library.replace.mockResolvedValueOnce("name-taken");

    // act
    const result = await useCase.execute({
      exerciseId: "exercise-1",
      draft: SQUAT_REVISED,
    });

    // assert
    expect(result).toEqual({ status: "invalid", problems: { name: "taken" } });
  });

  it("finds nothing to edit for an unknown exercise", async () => {
    // arrange
    const { useCase, library } = createUseCase();

    // act
    const result = await useCase.execute({
      exerciseId: "exercise-404",
      draft: SQUAT_REVISED,
    });

    // assert
    expect(result).toEqual({ status: "not-found" });
    expect(library.replace).not.toHaveBeenCalled();
  });

  it("reports a failed read and answers that the edit failed without replacing it", async () => {
    // arrange
    const failure = new Error("connection terminated");
    const { useCase, library, incidents } = createUseCase();
    library.find.mockRejectedValueOnce(failure);

    // act
    const result = await useCase.execute({
      exerciseId: "exercise-1",
      draft: SQUAT_REVISED,
    });

    // assert
    expect(result).toEqual({ status: "failed" });
    expect(library.replace).not.toHaveBeenCalled();
    expect(incidents.exerciseEditFailed).toHaveBeenCalledWith({
      exerciseId: "exercise-1",
      error: failure,
    });
  });

  it("reports a failed write and answers that the edit failed", async () => {
    // arrange
    const failure = new Error("connection terminated");
    const { useCase, library, incidents } = createUseCase();
    library.replace.mockRejectedValueOnce(failure);

    // act
    const result = await useCase.execute({
      exerciseId: "exercise-1",
      draft: SQUAT_REVISED,
    });

    // assert
    expect(result).toEqual({ status: "failed" });
    expect(incidents.exerciseEditFailed).toHaveBeenCalledWith({
      exerciseId: "exercise-1",
      error: failure,
    });
  });
});
