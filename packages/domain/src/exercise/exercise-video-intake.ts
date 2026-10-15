import {
  EXERCISE_VIDEO_FORMATS,
  EXERCISE_VIDEO_MEDIA_TYPES,
  type ExerciseVideoFormat,
  type ExerciseVideoRefusal,
} from "./exercise-video";
import type { StagedExerciseVideo } from "./exercise-video-store";

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

const ACCEPTED_DETECTED_TYPES: ReadonlyMap<string, ExerciseVideoFormat> =
  new Map([
    ["mp4", "mp4"],
    ["mov", "mov"],
  ]);

export class ExerciseVideoIntake {
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
}
