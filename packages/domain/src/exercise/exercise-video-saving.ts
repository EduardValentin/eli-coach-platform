import type { ExerciseVideoChange } from "./exercise";
import type { ExerciseLibraryIncidents } from "./exercise-library-incidents";
import {
  ExerciseVideo,
  type ExerciseVideoFormat,
  type ExerciseVideoRefusal,
} from "./exercise-video";
import type { ExerciseVideoFormatDetector } from "./exercise-video-format-detector";
import {
  ExerciseVideoIntake,
  type ExerciseVideoChoice,
} from "./exercise-video-intake";
import type {
  ExerciseVideoStore,
  StagedExerciseVideo,
} from "./exercise-video-store";

type JudgedVideoChoice =
  | { kind: "keep" }
  | { kind: "remove" }
  | {
      kind: "attach";
      staged: StagedExerciseVideo;
      format: ExerciseVideoFormat;
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
    const judgement = ExerciseVideoIntake.judge({
      detectedType: await this.options.formats.detect(staged.leadingBytes),
      sizeBytes: staged.sizeBytes,
    });

    return judgement.status === "accepted"
      ? { kind: "attach", staged, format: judgement.format }
      : { kind: "refused", staged, refusal: judgement.refusal };
  }

  async keepAccepted(
    choice: AcceptedVideoChoice,
  ): Promise<ExerciseVideoChange> {
    if (choice.kind !== "attach") return choice;

    const videoId = await this.options.store.keep(choice.staged.stagingId);

    return {
      kind: "attach",
      video: ExerciseVideo.of({
        videoId,
        format: choice.format,
        sizeBytes: choice.staged.sizeBytes,
      }),
    };
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

    await this.cleanUp(choice.staged.stagingId, () =>
      this.options.store.discard(choice.staged.stagingId),
    );
  }

  async removeStored(video: ExerciseVideo | null): Promise<void> {
    if (!video) return;

    await this.cleanUp(video.videoId, () =>
      this.options.store.remove(video.videoId),
    );
  }

  private async removeUnwritten(change: ExerciseVideoChange): Promise<void> {
    if (change.kind !== "attach") return;

    await this.removeStored(change.video);
  }

  private async cleanUp(
    videoId: string,
    removal: () => Promise<void>,
  ): Promise<void> {
    try {
      await removal();
    } catch (error) {
      this.options.incidents.videoCleanupFailed({ videoId, error });
    }
  }
}
