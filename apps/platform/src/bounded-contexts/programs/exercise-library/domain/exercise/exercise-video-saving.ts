import type { ExerciseVideoChange } from "./exercise";
import type { ExerciseLibraryIncidentsPort } from "./exercise-library-incidents-port";
import type { ExerciseVideo } from "./exercise-video";
import { ExerciseVideoCleanup } from "./exercise-video-cleanup";
import type { ExerciseVideoFormatDetectorPort } from "./exercise-video-format-detector-port";
import type { ExerciseVideoIdsPort } from "./exercise-video-ids-port";
import type {
  ExerciseVideoStorePort,
  StagedExerciseVideo,
} from "./exercise-video-store-port";
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
  exerciseVideoFormatDetectorPort: ExerciseVideoFormatDetectorPort;
  exerciseVideoIdsPort: ExerciseVideoIdsPort;
  exerciseVideoStorePort: Pick<
    ExerciseVideoStorePort,
    "keep" | "discard" | "remove"
  >;
  exerciseLibraryIncidentsPort: Pick<
    ExerciseLibraryIncidentsPort,
    "videoCleanupFailed"
  >;
};

export class ExerciseVideoSaving {
  private readonly cleanup: ExerciseVideoCleanup;

  constructor(private readonly options: ExerciseVideoSavingOptions) {
    this.cleanup = new ExerciseVideoCleanup(options);
  }

  async judged(choice: ExerciseVideoChoice): Promise<JudgedVideoChoice> {
    if (choice.kind !== "attach") return choice;

    const { staged } = choice;
    const inspection = ExerciseVideoUpload.inspect({
      detectedType: await this.options.exerciseVideoFormatDetectorPort.detect(
        staged.leadingBytes,
      ),
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

    const videoId = this.options.exerciseVideoIdsPort.generate();
    await this.options.exerciseVideoStorePort.keep(
      choice.staged.stagingId,
      videoId,
    );

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

    await this.cleanup.discardStaged(choice.staged);
  }

  async removeStored(video: ExerciseVideo | null): Promise<void> {
    await this.cleanup.removeStored(video);
  }

  private async removeUnwritten(change: ExerciseVideoChange): Promise<void> {
    if (change.kind !== "attach") return;

    await this.cleanup.removeStored(change.video);
  }
}
