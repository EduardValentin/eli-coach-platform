import type { Exercise } from "./exercise";
import type { ExerciseLibrary, ExerciseReference } from "./exercise-library";

export type FindExerciseResult =
  | { status: "found"; exercise: Exercise; otherNames: string[] }
  | { status: "not-found" };

type FindExerciseUseCaseOptions = {
  library: ExerciseLibrary;
};

export class FindExerciseUseCase {
  constructor(private readonly options: FindExerciseUseCaseOptions) {}

  async execute(reference: ExerciseReference): Promise<FindExerciseResult> {
    const { library } = this.options;
    const [exercise, exercises] = await Promise.all([
      library.find(reference),
      library.list(reference.ownerAccountId),
    ]);

    if (!exercise) return { status: "not-found" };

    return {
      status: "found",
      exercise,
      otherNames: exercises
        .filter(({ id }) => id !== reference.exerciseId)
        .map(({ name }) => name),
    };
  }
}
