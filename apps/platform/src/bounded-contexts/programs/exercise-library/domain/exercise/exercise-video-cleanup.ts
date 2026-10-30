import type {
  ExerciseLibraryIncidentsPort,
  UncleanedExerciseVideoFile,
} from "./exercise-library-incidents-port";
import type { ExerciseVideo } from "./exercise-video";
import type {
  ExerciseVideoStorePort,
  StagedExerciseVideo,
} from "./exercise-video-store-port";

type ExerciseVideoCleanupOptions = {
  exerciseVideoStorePort: Pick<ExerciseVideoStorePort, "discard" | "remove">;
  exerciseLibraryIncidentsPort: Pick<
    ExerciseLibraryIncidentsPort,
    "videoCleanupFailed"
  >;
};

export class ExerciseVideoCleanup {
  constructor(private readonly options: ExerciseVideoCleanupOptions) {}

  async discardStaged(staged: StagedExerciseVideo): Promise<void> {
    const { stagingId } = staged;

    await this.cleanUp({ stagingId }, () =>
      this.options.exerciseVideoStorePort.discard(stagingId),
    );
  }

  async removeStored(video: ExerciseVideo | null): Promise<void> {
    if (!video) return;

    const { videoId } = video;

    await this.cleanUp({ videoId }, () =>
      this.options.exerciseVideoStorePort.remove(videoId),
    );
  }

  private async cleanUp(
    file: UncleanedExerciseVideoFile,
    removal: () => Promise<void>,
  ): Promise<void> {
    try {
      await removal();
    } catch (error) {
      this.options.exerciseLibraryIncidentsPort.videoCleanupFailed({
        ...file,
        error,
      });
    }
  }
}
