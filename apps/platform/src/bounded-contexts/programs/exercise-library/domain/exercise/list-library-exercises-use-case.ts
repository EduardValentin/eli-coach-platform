import type { ExerciseSnapshot } from "./exercise";
import type { ExerciseLibraryPort } from "./exercise-library-port";
import type { ExerciseStatus } from "./exercise-listing";

export type LibraryExerciseEntry = ExerciseSnapshot & {
  status: ExerciseStatus;
};

type ListLibraryExercisesUseCaseOptions = {
  exerciseLibraryPort: Pick<ExerciseLibraryPort, "list">;
};

export class ListLibraryExercisesUseCase {
  constructor(private readonly options: ListLibraryExercisesUseCaseOptions) {}

  async execute(ownerAccountId: string): Promise<LibraryExerciseEntry[]> {
    const exercises =
      await this.options.exerciseLibraryPort.list(ownerAccountId);

    return exercises.map((exercise) => ({
      ...exercise.toSnapshot(),
      status: exercise.status,
    }));
  }
}
