import type { Exercise } from "./exercise";
import type {
  ExerciseLibraryPort,
  ExerciseReference,
} from "./exercise-library-port";
import { ExerciseNames } from "./exercise-names";

export type FindExerciseResult =
  | { status: "found"; exercise: Exercise; otherNames: string[] }
  | { status: "not-found" }
  | { status: "archived" };

type FindExerciseUseCaseOptions = {
  library: Pick<ExerciseLibraryPort, "list">;
};

export class FindExerciseUseCase {
  constructor(private readonly options: FindExerciseUseCaseOptions) {}

  async execute(reference: ExerciseReference): Promise<FindExerciseResult> {
    const exercises = await this.options.library.list(reference.ownerAccountId);
    const exercise = exercises.find(({ id }) => id === reference.exerciseId);

    if (!exercise) return { status: "not-found" };

    if (exercise.status === "archived") return { status: "archived" };

    return {
      status: "found",
      exercise,
      otherNames: ExerciseNames.reservedBy(
        exercises,
        reference.exerciseId,
      ).toArray(),
    };
  }
}
