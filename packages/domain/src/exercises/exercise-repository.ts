import type { Exercise, ExerciseDraft, ExerciseVideo } from "./exercise-model";

export type PersistExerciseCommand = ExerciseDraft & {
  video: ExerciseVideo | null;
};

export interface ExerciseRepository {
  listExercises(): Promise<readonly Exercise[]>;
  findExerciseById(id: string): Promise<Exercise | null>;
  findVideoByAssetKey(assetKey: string): Promise<ExerciseVideo | null>;
  insertExercise(command: PersistExerciseCommand): Promise<Exercise>;
  updateExercise(
    id: string,
    command: PersistExerciseCommand,
  ): Promise<Exercise | null>;
}
