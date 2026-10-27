import type { Exercise } from "./exercise";

export type ExerciseAddition = "added" | "name-taken";

export type ExerciseReplacement = "replaced" | "name-taken";

export type ExerciseRemoval = "removed" | "missing";

export type ExerciseReference = {
  ownerAccountId: string;
  exerciseId: string;
};

export interface ExerciseLibrary {
  list(ownerAccountId: string): Promise<Exercise[]>;
  find(reference: ExerciseReference): Promise<Exercise | null>;
  add(exercise: Exercise): Promise<ExerciseAddition>;
  replace(exercise: Exercise): Promise<ExerciseReplacement>;
  remove(reference: ExerciseReference): Promise<ExerciseRemoval>;
}
