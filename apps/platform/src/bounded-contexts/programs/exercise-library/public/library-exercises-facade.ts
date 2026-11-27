export type LibraryExerciseView = {
  exerciseId: string;
  name: string;
  type: string;
  unit: string;
  perSide: boolean;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string[];
  difficulty: string;
  pattern: string | null;
  role: string | null;
  tags: string[];
  cues: string;
  videoPath: string | null;
  archived: boolean;
};

export interface LibraryExercisesFacade {
  listLibraryExercises(coachAccountId: string): Promise<LibraryExerciseView[]>;
}
