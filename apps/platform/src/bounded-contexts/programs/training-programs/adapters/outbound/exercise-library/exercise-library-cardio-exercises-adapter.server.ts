import type {
  CardioExercise,
  CardioExercisesPort,
} from "~/bounded-contexts/programs/training-programs/domain/program";
import type { CardioExercisesFacade } from "~/bounded-contexts/programs/exercise-library/public/cardio-exercises-facade";

export class ExerciseLibraryCardioExercisesAdapter implements CardioExercisesPort {
  constructor(private readonly cardioExercisesFacade: CardioExercisesFacade) {}

  async listFor(coachAccountId: string): Promise<CardioExercise[]> {
    const exercises =
      await this.cardioExercisesFacade.listCardioExercises(coachAccountId);

    return exercises.map(({ exerciseId, name }) => ({ id: exerciseId, name }));
  }
}
