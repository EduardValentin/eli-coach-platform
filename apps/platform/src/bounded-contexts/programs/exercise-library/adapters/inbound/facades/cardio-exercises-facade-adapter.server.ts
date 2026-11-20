import type { ListCardioExercisesUseCase } from "~/bounded-contexts/programs/exercise-library/domain/exercise";
import type {
  CardioExercisesFacade,
  CardioExerciseView,
} from "~/bounded-contexts/programs/exercise-library/public/cardio-exercises-facade";
import type { UnitOfWork } from "~/shared/http/unit-of-work";

type CardioExercisesFacadeAdapterOptions = {
  listCardioExercisesUseCase: ListCardioExercisesUseCase;
  unitOfWork: UnitOfWork;
};

export class CardioExercisesFacadeAdapter implements CardioExercisesFacade {
  constructor(private readonly options: CardioExercisesFacadeAdapterOptions) {}

  async listCardioExercises(
    ownerAccountId: string,
  ): Promise<CardioExerciseView[]> {
    const exercises = await this.options.unitOfWork(() =>
      this.options.listCardioExercisesUseCase.execute(ownerAccountId),
    );

    return exercises.map((exercise) => ({
      exerciseId: exercise.id,
      name: exercise.name,
    }));
  }
}
