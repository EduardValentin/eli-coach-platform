import type { Exercise } from "./exercise";
import type {
  ExerciseLibraryPort,
  ExerciseReference,
} from "./exercise-library-port";
import type { ExerciseVideoCleanup } from "./exercise-video-cleanup";

export type DeleteExerciseResult =
  { status: "deleted"; exercise: Exercise } | { status: "not-found" };

type DeleteExerciseUseCaseOptions = {
  exerciseLibraryPort: Pick<ExerciseLibraryPort, "find" | "remove">;
  videos: Pick<ExerciseVideoCleanup, "removeStored">;
};

export class DeleteExerciseUseCase {
  constructor(private readonly options: DeleteExerciseUseCaseOptions) {}

  async execute(reference: ExerciseReference): Promise<DeleteExerciseResult> {
    const { exerciseLibraryPort } = this.options;
    const exercise = await exerciseLibraryPort.find(reference);

    if (!exercise) {
      return { status: "not-found" };
    }

    const removal = await exerciseLibraryPort.remove(reference);

    if (removal === "missing") {
      return { status: "not-found" };
    }

    await this.options.videos.removeStored(exercise.video);

    return { status: "deleted", exercise };
  }
}
