import { isUuid } from "./exercise-ids";
import { InvalidStoredExerciseError } from "./invalid-stored-exercise-error";

export const EXERCISE_VIDEO_FORMATS = ["mp4", "mov"] as const;

export type ExerciseVideoFormat = (typeof EXERCISE_VIDEO_FORMATS)[number];

const EXERCISE_VIDEO_MEDIA_TYPES = {
  mp4: "video/mp4",
  mov: "video/quicktime",
} as const satisfies Record<ExerciseVideoFormat, string>;

export const MAX_EXERCISE_VIDEO_BYTES = 50 * 1024 * 1024;

export const EXERCISE_VIDEO_EXTENSIONS: readonly string[] = [
  ...EXERCISE_VIDEO_FORMATS,
];

export const ACCEPTED_EXERCISE_VIDEO_MEDIA_TYPES: readonly string[] =
  Object.values(EXERCISE_VIDEO_MEDIA_TYPES);

export type ExerciseVideoSnapshot = {
  videoId: string;
  format: ExerciseVideoFormat;
  sizeBytes: number;
};

export type StoredExerciseVideo = {
  videoId: string;
  format: string;
  sizeBytes: number;
};

export class ExerciseVideo {
  private constructor(private readonly snapshot: ExerciseVideoSnapshot) {}

  static fromStored(stored: StoredExerciseVideo): ExerciseVideo {
    const format = EXERCISE_VIDEO_FORMATS.find(
      (known) => known === stored.format,
    );
    const storableSize =
      Number.isInteger(stored.sizeBytes) &&
      stored.sizeBytes > 0 &&
      stored.sizeBytes <= MAX_EXERCISE_VIDEO_BYTES;
    const broken = [
      ...(isUuid(stored.videoId) ? [] : ["video.videoId"]),
      ...(format ? [] : ["video.format"]),
      ...(storableSize ? [] : ["video.sizeBytes"]),
    ];

    if (!format || broken.length > 0) {
      throw new InvalidStoredExerciseError(broken);
    }

    return new ExerciseVideo({
      videoId: stored.videoId,
      format,
      sizeBytes: stored.sizeBytes,
    });
  }

  get videoId(): string {
    return this.snapshot.videoId;
  }

  get mediaType(): string {
    return EXERCISE_VIDEO_MEDIA_TYPES[this.snapshot.format];
  }

  isStoredAs(videoId: string): boolean {
    return this.snapshot.videoId === videoId;
  }

  toSnapshot(): ExerciseVideoSnapshot {
    return { ...this.snapshot };
  }
}
