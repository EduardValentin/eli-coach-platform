import type { Exercise } from "./exercise";
import type { ExerciseLibraryPort } from "./exercise-library-port";

export type ListExercisesResult = { status: "listed"; exercises: Exercise[] };

type ListExercisesUseCaseOptions = {
  library: ExerciseLibraryPort;
};

export class ListExercisesUseCase {
  constructor(private readonly options: ListExercisesUseCaseOptions) {}

  async execute(ownerAccountId: string): Promise<ListExercisesResult> {
    return {
      status: "listed",
      exercises: await this.options.library.list(ownerAccountId),
    };
  }
}
