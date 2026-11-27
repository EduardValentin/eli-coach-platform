import { describe, expect, it } from "vitest";

import type {
  LibraryExercisesFacade,
  LibraryExerciseView,
} from "~/bounded-contexts/programs/exercise-library/public/library-exercises-facade";

import { ExerciseLibraryLibraryExercisesAdapter } from "./exercise-library-library-exercises-adapter.server";

class LibraryExercisesFacadeDouble implements LibraryExercisesFacade {
  constructor(
    private readonly exercisesByCoach: Record<string, LibraryExerciseView[]>,
  ) {}

  async listLibraryExercises(
    coachAccountId: string,
  ): Promise<LibraryExerciseView[]> {
    return this.exercisesByCoach[coachAccountId] ?? [];
  }
}

const GOBLET_SQUAT: LibraryExerciseView = {
  exerciseId: "exercise-1",
  name: "Goblet squat",
  type: "resistance",
  unit: "reps",
  perSide: false,
  primaryMuscles: ["Quadriceps", "Glutes"],
  secondaryMuscles: ["Core"],
  equipment: ["Dumbbells", "Kettlebell"],
  difficulty: "Beginner",
  pattern: "squat",
  role: "main-compound",
  tags: ["Strength", "Hypertrophy"],
  cues: "Elbows inside the knees.",
  videoPath: "/coach/exercises/exercise-1/videos/video-1",
  archived: false,
};

const ROWING_MACHINE: LibraryExerciseView = {
  exerciseId: "exercise-2",
  name: "Rowing machine",
  type: "cardio",
  unit: "time",
  perSide: false,
  primaryMuscles: ["Full body"],
  secondaryMuscles: [],
  equipment: ["Rower"],
  difficulty: "Intermediate",
  pattern: null,
  role: null,
  tags: [],
  cues: "",
  videoPath: null,
  archived: true,
};

function adapterOver(exercisesByCoach: Record<string, LibraryExerciseView[]>) {
  return new ExerciseLibraryLibraryExercisesAdapter(
    new LibraryExercisesFacadeDouble(exercisesByCoach),
  );
}

describe("ExerciseLibraryLibraryExercisesAdapter", () => {
  it("translates every exercise of the coach, archived ones included, in the library's order", async () => {
    // arrange
    const exerciseLibraryLibraryExercisesAdapter = adapterOver({
      "coach-account-1": [GOBLET_SQUAT, ROWING_MACHINE],
      "coach-account-2": [{ ...GOBLET_SQUAT, exerciseId: "exercise-3" }],
    });

    // act
    const libraryExercises =
      await exerciseLibraryLibraryExercisesAdapter.listFor("coach-account-1");

    // assert
    expect(libraryExercises).toEqual([
      {
        id: "exercise-1",
        name: "Goblet squat",
        type: "resistance",
        unit: "reps",
        perSide: false,
        pattern: "squat",
        role: "main-compound",
        primaryMuscles: ["Quadriceps", "Glutes"],
        secondaryMuscles: ["Core"],
        equipment: ["Dumbbells", "Kettlebell"],
        tags: ["Strength", "Hypertrophy"],
        cues: "Elbows inside the knees.",
        videoPath: "/coach/exercises/exercise-1/videos/video-1",
        archived: false,
      },
      {
        id: "exercise-2",
        name: "Rowing machine",
        type: "cardio",
        unit: "time",
        perSide: false,
        pattern: null,
        role: null,
        primaryMuscles: ["Full body"],
        secondaryMuscles: [],
        equipment: ["Rower"],
        tags: [],
        cues: "",
        videoPath: null,
        archived: true,
      },
    ]);
  });

  it("answers none for a coach without exercises", async () => {
    // arrange
    const exerciseLibraryLibraryExercisesAdapter = adapterOver({});

    // act
    const libraryExercises =
      await exerciseLibraryLibraryExercisesAdapter.listFor("coach-account-1");

    // assert
    expect(libraryExercises).toEqual([]);
  });

  it.each<[string, Partial<LibraryExerciseView>]>([
    ["type", { type: "plyometric" }],
    ["unit", { unit: "laps" }],
    ["pattern", { pattern: "twist" }],
    ["role", { role: "accessory" }],
    ["muscle", { secondaryMuscles: ["Neck"] }],
    ["equipment", { equipment: ["Sled"] }],
    ["tag", { tags: ["Power"] }],
  ])(
    "refuses an exercise whose %s is outside the program's vocabulary",
    async (_field, drift) => {
      // arrange
      const exerciseLibraryLibraryExercisesAdapter = adapterOver({
        "coach-account-1": [{ ...GOBLET_SQUAT, ...drift }],
      });

      // act
      const listed =
        exerciseLibraryLibraryExercisesAdapter.listFor("coach-account-1");

      // assert
      await expect(listed).rejects.toThrow(/Goblet squat/);
    },
  );
});
