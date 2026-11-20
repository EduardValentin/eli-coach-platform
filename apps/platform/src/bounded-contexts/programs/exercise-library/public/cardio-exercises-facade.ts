export type CardioExerciseView = {
  exerciseId: string;
  name: string;
};

export interface CardioExercisesFacade {
  listCardioExercises(ownerAccountId: string): Promise<CardioExerciseView[]>;
}
