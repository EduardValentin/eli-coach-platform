import type { Exercise } from "./exercise";
import type { ExerciseLibraryPort } from "./exercise-library-port";

type ListCardioExercisesUseCaseOptions = {
  exerciseLibraryPort: Pick<ExerciseLibraryPort, "list">;
};

export class ListCardioExercisesUseCase {
  constructor(private readonly options: ListCardioExercisesUseCaseOptions) {}

  async execute(ownerAccountId: string): Promise<Exercise[]> {
    const exercises =
      await this.options.exerciseLibraryPort.list(ownerAccountId);

    return exercises.filter(
      (exercise) =>
        exercise.status === "active" && exercise.toSnapshot().type === "cardio",
    );
  }
}
