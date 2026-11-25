import type {
  ExerciseLibraryPort,
  ExerciseReference,
} from "./exercise-library-port";
import type { ExerciseVideoCleanup } from "./exercise-video-cleanup";

export type DeleteExerciseResult =
  | { status: "deleted"; name: string }
  | { status: "in-use"; programCount: number }
  | { status: "not-found" };

type DeleteExerciseUseCaseOptions = {
  exerciseLibraryPort: Pick<
    ExerciseLibraryPort,
    "find" | "remove" | "programCountsOf"
  >;
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

    const programCounts = await exerciseLibraryPort.programCountsOf(
      reference.ownerAccountId,
    );
    const programCount = programCounts.get(exercise.id) ?? 0;

    if (programCount > 0) {
      return { status: "in-use", programCount };
    }

    const removal = await exerciseLibraryPort.remove(reference);

    if (removal === "missing") {
      return { status: "not-found" };
    }

    await this.options.videos.removeStored(exercise.video);

    return { status: "deleted", name: exercise.name };
  }
}
