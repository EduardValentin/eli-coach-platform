export type CardioExercise = { id: string; name: string };

export interface CardioExercisesPort {
  listFor(coachAccountId: string): Promise<CardioExercise[]>;
}
