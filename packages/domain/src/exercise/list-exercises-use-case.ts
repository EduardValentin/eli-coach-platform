import type { Exercise } from "./exercise";
import type { ExerciseLibrary } from "./exercise-library";

export type ListExercisesResult = { status: "listed"; exercises: Exercise[] };

type ListExercisesUseCaseOptions = {
  library: ExerciseLibrary;
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
