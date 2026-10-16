import type { Exercise } from "./exercise";
import type { ExerciseLibrary, ExerciseReference } from "./exercise-library";
import type { ExerciseLibraryIncidents } from "./exercise-library-incidents";
import type { ExerciseVideo } from "./exercise-video";
import type { ExerciseVideoStore } from "./exercise-video-store";

export type DeleteExerciseResult =
  { status: "deleted"; exercise: Exercise } | { status: "not-found" };

type DeleteExerciseUseCaseOptions = {
  library: Pick<ExerciseLibrary, "find" | "remove">;
  store: Pick<ExerciseVideoStore, "remove">;
  incidents: Pick<ExerciseLibraryIncidents, "videoCleanupFailed">;
};

export class DeleteExerciseUseCase {
  constructor(private readonly options: DeleteExerciseUseCaseOptions) {}

  async execute(reference: ExerciseReference): Promise<DeleteExerciseResult> {
    const { library } = this.options;
    const exercise = await library.find(reference);

    if (!exercise || (await library.remove(reference)) === "missing") {
      return { status: "not-found" };
    }

    await this.removeVideo(exercise.video);

    return { status: "deleted", exercise };
  }

  private async removeVideo(video: ExerciseVideo | null): Promise<void> {
    if (!video) return;

    const { videoId } = video;

    try {
      await this.options.store.remove(videoId);
    } catch (error) {
      this.options.incidents.videoCleanupFailed({ videoId, error });
    }
  }
}
