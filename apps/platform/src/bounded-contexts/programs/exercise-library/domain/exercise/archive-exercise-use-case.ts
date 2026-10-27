import type { Clock } from "../clock";
import type { Exercise } from "./exercise";
import type { ExerciseLibrary, ExerciseReference } from "./exercise-library";

export type ArchiveExerciseResult =
  { status: "archived"; exercise: Exercise } | { status: "not-found" };

type ArchiveExerciseUseCaseOptions = {
  library: Pick<ExerciseLibrary, "find" | "replace">;
  clock: Clock;
};

export class ArchiveExerciseUseCase {
  constructor(private readonly options: ArchiveExerciseUseCaseOptions) {}

  async execute(reference: ExerciseReference): Promise<ArchiveExerciseResult> {
    const { library, clock } = this.options;
    const exercise = await library.find(reference);

    if (!exercise) return { status: "not-found" };

    const archived = exercise.archived(clock.now());
    await library.replace(archived);

    return { status: "archived", exercise: archived };
  }
}
