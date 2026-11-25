import {
  EQUIPMENT,
  EXERCISE_ROLES,
  EXERCISE_TAGS,
  EXERCISE_TYPES,
  EXERCISE_UNITS,
  MOVEMENT_PATTERNS,
  MUSCLES,
  type LibraryExercise,
  type LibraryExercisesPort,
} from "~/bounded-contexts/programs/training-programs/domain/program";
import type {
  LibraryExercisesFacade,
  LibraryExerciseView,
} from "~/bounded-contexts/programs/exercise-library/public/library-exercises-facade";

export class ExerciseLibraryLibraryExercisesAdapter implements LibraryExercisesPort {
  constructor(
    private readonly libraryExercisesFacade: LibraryExercisesFacade,
  ) {}

  async listFor(coachAccountId: string): Promise<LibraryExercise[]> {
    const exercises =
      await this.libraryExercisesFacade.listLibraryExercises(coachAccountId);

    return exercises.map((exercise) => this.libraryExerciseOf(exercise));
  }

  private libraryExerciseOf(exercise: LibraryExerciseView): LibraryExercise {
    const termOf = <Term extends string>(
      vocabulary: readonly Term[],
      value: string,
    ): Term => {
      const term = vocabulary.find((candidate) => candidate === value);

      if (term === undefined) {
        throw new Error(
          `The library's exercise ${exercise.name} holds ${value}, outside ${vocabulary.join(", ")}.`,
        );
      }

      return term;
    };
    const termsOf = <Term extends string>(
      vocabulary: readonly Term[],
      values: readonly string[],
    ): Term[] => values.map((value) => termOf(vocabulary, value));

    return {
      id: exercise.exerciseId,
      name: exercise.name,
      type: termOf(EXERCISE_TYPES, exercise.type),
      unit: termOf(EXERCISE_UNITS, exercise.unit),
      perSide: exercise.perSide,
      pattern:
        exercise.pattern === null
          ? null
          : termOf(MOVEMENT_PATTERNS, exercise.pattern),
      role:
        exercise.role === null ? null : termOf(EXERCISE_ROLES, exercise.role),
      primaryMuscles: termsOf(MUSCLES, exercise.primaryMuscles),
      secondaryMuscles: termsOf(MUSCLES, exercise.secondaryMuscles),
      equipment: termsOf(EQUIPMENT, exercise.equipment),
      tags: termsOf(EXERCISE_TAGS, exercise.tags),
      cues: exercise.cues,
      videoPath: exercise.videoPath,
      archived: exercise.archived,
    };
  }
}
