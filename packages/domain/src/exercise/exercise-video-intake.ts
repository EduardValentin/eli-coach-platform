import type { ExerciseVideoChange } from "./exercise";
import type { ExerciseLibraryIncidents } from "./exercise-library-incidents";
import {
  EXERCISE_VIDEO_FORMATS,
  EXERCISE_VIDEO_MEDIA_TYPES,
  ExerciseVideo,
  type ExerciseVideoFormat,
  type ExerciseVideoRefusal,
} from "./exercise-video";
import type { ExerciseVideoFormatDetector } from "./exercise-video-format-detector";
import type {
  ExerciseVideoStore,
  StagedExerciseVideo,
} from "./exercise-video-store";

export const MAX_EXERCISE_VIDEO_BYTES = 50 * 1024 * 1024;

export const EXERCISE_VIDEO_EXTENSIONS: readonly string[] =
  EXERCISE_VIDEO_FORMATS;

export const ACCEPTED_EXERCISE_VIDEO_MEDIA_TYPES: readonly string[] =
  Object.values(EXERCISE_VIDEO_MEDIA_TYPES);

export type ExerciseVideoJudgement =
  | { status: "accepted"; format: ExerciseVideoFormat }
  | { status: "refused"; refusal: ExerciseVideoRefusal };

type ExerciseVideoFacts = { detectedType: string | null; sizeBytes: number };

export type ExerciseVideoChoice =
  | { kind: "keep" }
  | { kind: "remove" }
  | { kind: "attach"; staged: StagedExerciseVideo };

export type JudgedVideoChoice =
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

type ExerciseVideoIntakeOptions = {
  formats: ExerciseVideoFormatDetector;
  store: Pick<ExerciseVideoStore, "keep" | "discard" | "remove">;
  incidents: Pick<ExerciseLibraryIncidents, "videoCleanupFailed">;
};

const ACCEPTED_DETECTED_TYPES: ReadonlyMap<string, ExerciseVideoFormat> =
  new Map([
    ["mp4", "mp4"],
    ["mov", "mov"],
  ]);

export class ExerciseVideoIntake {
  constructor(private readonly options: ExerciseVideoIntakeOptions) {}

  static judge(facts: ExerciseVideoFacts): ExerciseVideoJudgement {
    const format =
      facts.detectedType === null
        ? undefined
        : ACCEPTED_DETECTED_TYPES.get(facts.detectedType);

    if (!format) return { status: "refused", refusal: "unsupported" };
    if (facts.sizeBytes > MAX_EXERCISE_VIDEO_BYTES) {
      return { status: "refused", refusal: "too-large" };
    }

    return { status: "accepted", format };
  }

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

  async changeFor(choice: AcceptedVideoChoice): Promise<ExerciseVideoChange> {
    if (choice.kind !== "attach") return choice;

    const fileId = await this.options.store.keep(choice.staged.stagingId);

    return {
      kind: "attach",
      video: ExerciseVideo.of({
        fileId,
        format: choice.format,
        sizeBytes: choice.staged.sizeBytes,
      }),
    };
  }

  async writtenWith<Outcome extends string>(
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

    await this.cleanUp(video.fileId, () =>
      this.options.store.remove(video.fileId),
    );
  }

  private async removeUnwritten(change: ExerciseVideoChange): Promise<void> {
    if (change.kind !== "attach") return;

    await this.removeStored(change.video);
  }

  private async cleanUp(
    fileId: string,
    removal: () => Promise<void>,
  ): Promise<void> {
    try {
      await removal();
    } catch (error) {
      this.options.incidents.videoCleanupFailed({ fileId, error });
    }
  }
}
