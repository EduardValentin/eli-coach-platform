import type { ExerciseVideoChange } from "./exercise";
import type {
  ExerciseLibraryIncidents,
  UncleanedExerciseVideoFile,
} from "./exercise-library-incidents";
import type { ExerciseVideo } from "./exercise-video";
import type { ExerciseVideoFormatDetector } from "./exercise-video-format-detector";
import type {
  ExerciseVideoStore,
  StagedExerciseVideo,
} from "./exercise-video-store";
import {
  ExerciseVideoUpload,
  type ExerciseVideoRefusal,
} from "./exercise-video-upload";

export type ExerciseVideoChoice =
  | { kind: "keep" }
  | { kind: "remove" }
  | { kind: "attach"; staged: StagedExerciseVideo };

type JudgedVideoChoice =
  | { kind: "keep" }
  | { kind: "remove" }
  | {
      kind: "attach";
      staged: StagedExerciseVideo;
      upload: ExerciseVideoUpload;
    }
  | {
      kind: "refused";
      staged: StagedExerciseVideo;
      refusal: ExerciseVideoRefusal;
    };

type AcceptedVideoChoice = Exclude<JudgedVideoChoice, { kind: "refused" }>;

type ExerciseVideoSavingOptions = {
  formats: ExerciseVideoFormatDetector;
  store: Pick<ExerciseVideoStore, "keep" | "discard" | "remove">;
  incidents: Pick<ExerciseLibraryIncidents, "videoCleanupFailed">;
};

export class ExerciseVideoSaving {
  constructor(private readonly options: ExerciseVideoSavingOptions) {}

  async judged(choice: ExerciseVideoChoice): Promise<JudgedVideoChoice> {
    if (choice.kind !== "attach") return choice;

    const { staged } = choice;
    const inspection = ExerciseVideoUpload.inspect({
      detectedType: await this.options.formats.detect(staged.leadingBytes),
      sizeBytes: staged.sizeBytes,
    });

    return inspection.status === "accepted"
      ? { kind: "attach", staged, upload: inspection.upload }
      : { kind: "refused", staged, refusal: inspection.refusal };
  }

  async keepAccepted(
    choice: AcceptedVideoChoice,
  ): Promise<ExerciseVideoChange> {
    if (choice.kind !== "attach") return choice;

    const videoId = await this.options.store.keep(choice.staged.stagingId);

    return { kind: "attach", video: choice.upload.storedAs(videoId) };
  }

  async writeOrRemoveKept<Outcome extends string>(
    change: ExerciseVideoChange,
    write: () => Promise<Outcome>,
  ): Promise<Outcome> {
    const outcome = await write().catch(async (error: unknown) => {
      await this.removeUnwritten(change);

      throw error;
    });

    if (outcome === "name-taken") await this.removeUnwritten(change);

    return outcome;
  }

  async discard(choice: ExerciseVideoChoice): Promise<void> {
    if (choice.kind !== "attach") return;

    const { stagingId } = choice.staged;

    await this.cleanUp({ stagingId }, () =>
      this.options.store.discard(stagingId),
    );
  }

  async removeStored(video: ExerciseVideo | null): Promise<void> {
    if (!video) return;

    const { videoId } = video;

    await this.cleanUp({ videoId }, () => this.options.store.remove(videoId));
  }

  private async removeUnwritten(change: ExerciseVideoChange): Promise<void> {
    if (change.kind !== "attach") return;

    await this.removeStored(change.video);
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
