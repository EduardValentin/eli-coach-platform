import type { ClockPort } from "../clock-port";
import type { Exercise } from "./exercise";
import type {
  ExerciseLibraryPort,
  ExerciseReference,
} from "./exercise-library-port";

export type ArchiveExerciseResult =
  { status: "archived"; exercise: Exercise } | { status: "not-found" };

type ArchiveExerciseUseCaseOptions = {
  exerciseLibraryPort: Pick<ExerciseLibraryPort, "find" | "replace">;
  clockPort: ClockPort;
};

export class ArchiveExerciseUseCase {
  constructor(private readonly options: ArchiveExerciseUseCaseOptions) {}

  async execute(reference: ExerciseReference): Promise<ArchiveExerciseResult> {
    const { exerciseLibraryPort, clockPort } = this.options;
    const exercise = await exerciseLibraryPort.find(reference);

    if (!exercise) return { status: "not-found" };

    const archived = exercise.archived(clockPort.now());
    await exerciseLibraryPort.replace(archived);

    return { status: "archived", exercise: archived };
  }
}
