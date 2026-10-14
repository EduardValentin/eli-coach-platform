import type { Exercise } from "./exercise";

export type ExerciseAddition = "added" | "name-taken";

export type ExerciseReplacement = "replaced" | "name-taken";

export interface ExerciseLibrary {
  list(): Promise<Exercise[]>;
  find(exerciseId: string): Promise<Exercise | null>;
  add(exercise: Exercise): Promise<ExerciseAddition>;
  replace(exercise: Exercise): Promise<ExerciseReplacement>;
}
