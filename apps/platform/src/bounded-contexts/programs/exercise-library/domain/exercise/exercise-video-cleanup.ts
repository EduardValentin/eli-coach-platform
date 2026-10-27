import type {
  ExerciseLibraryIncidents,
  UncleanedExerciseVideoFile,
} from "./exercise-library-incidents";
import type { ExerciseVideo } from "./exercise-video";
import type {
  ExerciseVideoStore,
  StagedExerciseVideo,
} from "./exercise-video-store";

type ExerciseVideoCleanupOptions = {
  store: Pick<ExerciseVideoStore, "discard" | "remove">;
  incidents: Pick<ExerciseLibraryIncidents, "videoCleanupFailed">;
};

export class ExerciseVideoCleanup {
  constructor(private readonly options: ExerciseVideoCleanupOptions) {}

  async discardStaged(staged: StagedExerciseVideo): Promise<void> {
    const { stagingId } = staged;

    await this.cleanUp({ stagingId }, () =>
      this.options.store.discard(stagingId),
    );
  }

  async removeStored(video: ExerciseVideo | null): Promise<void> {
    if (!video) return;

    const { videoId } = video;

    await this.cleanUp({ videoId }, () => this.options.store.remove(videoId));
  }

  private async cleanUp(
    file: UncleanedExerciseVideoFile,
    removal: () => Promise<void>,
  ): Promise<void> {
    try {
      await removal();
    } catch (error) {
      this.options.incidents.videoCleanupFailed({ ...file, error });
    }
  }
}
