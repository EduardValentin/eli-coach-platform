import type { Exercise } from "./exercise";
import type { ExerciseLibrary, ExerciseReference } from "./exercise-library";

export type FindExerciseResult =
  | { status: "found"; exercise: Exercise; otherNames: string[] }
  | { status: "not-found" };

type FindExerciseUseCaseOptions = {
  library: Pick<ExerciseLibrary, "list">;
};

export class FindExerciseUseCase {
  constructor(private readonly options: FindExerciseUseCaseOptions) {}

  async execute(reference: ExerciseReference): Promise<FindExerciseResult> {
    const exercises = await this.options.library.list(reference.ownerAccountId);
    const exercise = exercises.find(({ id }) => id === reference.exerciseId);

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
