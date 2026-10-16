import {
  ExerciseVideo,
  MAX_EXERCISE_VIDEO_BYTES,
  type ExerciseVideoFormat,
} from "./exercise-video";

export type ExerciseVideoRefusal = "unsupported" | "too-large";

export type ExerciseVideoUploadSnapshot = {
  format: ExerciseVideoFormat;
  sizeBytes: number;
};

export type ExerciseVideoUploadInspection =
  | { status: "accepted"; upload: ExerciseVideoUpload }
  | { status: "refused"; refusal: ExerciseVideoRefusal };

type ExerciseVideoUploadFacts = {
  detectedType: string | null;
  sizeBytes: number;
};

const ACCEPTED_DETECTED_TYPES: ReadonlyMap<string, ExerciseVideoFormat> =
  new Map([
    ["mp4", "mp4"],
    ["mov", "mov"],
  ]);

export class ExerciseVideoUpload {
  private constructor(private readonly snapshot: ExerciseVideoUploadSnapshot) {}

  static inspect(
    facts: ExerciseVideoUploadFacts,
  ): ExerciseVideoUploadInspection {
    const format =
      facts.detectedType === null
        ? undefined
        : ACCEPTED_DETECTED_TYPES.get(facts.detectedType);

    if (!format) return { status: "refused", refusal: "unsupported" };
    if (facts.sizeBytes > MAX_EXERCISE_VIDEO_BYTES) {
      return { status: "refused", refusal: "too-large" };
    }

    return {
      status: "accepted",
      upload: new ExerciseVideoUpload({ format, sizeBytes: facts.sizeBytes }),
    };
  }

  storedAs(videoId: string): ExerciseVideo {
    return ExerciseVideo.fromStored({ videoId, ...this.snapshot });
  }

  toSnapshot(): ExerciseVideoUploadSnapshot {
    return { ...this.snapshot };
  }
}
