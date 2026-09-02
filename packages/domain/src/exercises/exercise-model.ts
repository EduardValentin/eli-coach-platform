import type {
  Equipment,
  ExerciseDifficulty,
  ExerciseTag,
  MuscleGroup,
} from "./exercise-vocabulary";

export type ExerciseVideo = {
  assetKey: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
};

export type ExerciseDraft = {
  name: string;
  description: string;
  difficulty: ExerciseDifficulty;
  equipment: readonly Equipment[];
  primaryMuscles: readonly MuscleGroup[];
  secondaryMuscles: readonly MuscleGroup[];
  tags: readonly ExerciseTag[];
};

export type Exercise = ExerciseDraft & {
  id: string;
  video: ExerciseVideo | null;
  createdAt: Date;
  updatedAt: Date;
};
