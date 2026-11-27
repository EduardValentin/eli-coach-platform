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
    return {
      id: exercise.exerciseId,
      name: exercise.name,
      type: this.termOf(exercise, EXERCISE_TYPES, exercise.type),
      unit: this.termOf(exercise, EXERCISE_UNITS, exercise.unit),
      perSide: exercise.perSide,
      pattern:
        exercise.pattern === null
          ? null
          : this.termOf(exercise, MOVEMENT_PATTERNS, exercise.pattern),
      role:
        exercise.role === null
          ? null
          : this.termOf(exercise, EXERCISE_ROLES, exercise.role),
      primaryMuscles: this.termsOf(exercise, MUSCLES, exercise.primaryMuscles),
      secondaryMuscles: this.termsOf(
        exercise,
        MUSCLES,
        exercise.secondaryMuscles,
      ),
      equipment: this.termsOf(exercise, EQUIPMENT, exercise.equipment),
      tags: this.termsOf(exercise, EXERCISE_TAGS, exercise.tags),
      cues: exercise.cues,
      videoPath: exercise.videoPath,
      archived: exercise.archived,
    };
  }

  private termOf<Term extends string>(
    exercise: LibraryExerciseView,
    vocabulary: readonly Term[],
    value: string,
  ): Term {
    const term = vocabulary.find((candidate) => candidate === value);

    if (term === undefined) {
      throw new Error(
        `The library's exercise ${exercise.name} holds ${value}, outside ${vocabulary.join(", ")}.`,
      );
    }

    return term;
  }

  private termsOf<Term extends string>(
    exercise: LibraryExerciseView,
    vocabulary: readonly Term[],
    values: readonly string[],
  ): Term[] {
    return values.map((value) => this.termOf(exercise, vocabulary, value));
  }
}
