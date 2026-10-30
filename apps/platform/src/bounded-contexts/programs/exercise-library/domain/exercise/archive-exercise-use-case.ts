import type { ClockPort } from "../clock-port";
import type { Exercise } from "./exercise";
import type {
  ExerciseLibraryPort,
  ExerciseReference,
} from "./exercise-library-port";

export type ArchiveExerciseResult =
  { status: "archived"; exercise: Exercise } | { status: "not-found" };

type ArchiveExerciseUseCaseOptions = {
  library: Pick<ExerciseLibraryPort, "find" | "replace">;
  clock: ClockPort;
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
