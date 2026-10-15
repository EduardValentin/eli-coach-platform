export const EXERCISE_VIDEO_FORMATS = ["mp4", "mov"] as const;

export type ExerciseVideoFormat = (typeof EXERCISE_VIDEO_FORMATS)[number];

export const EXERCISE_VIDEO_MEDIA_TYPES = {
  mp4: "video/mp4",
  mov: "video/quicktime",
} as const satisfies Record<ExerciseVideoFormat, string>;

export type ExerciseVideoRefusal = "unsupported" | "too-large";

export type ExerciseVideoSnapshot = {
  fileId: string;
  format: ExerciseVideoFormat;
  sizeBytes: number;
};

export class ExerciseVideo {
  private constructor(private readonly snapshot: ExerciseVideoSnapshot) {}

  static of(snapshot: ExerciseVideoSnapshot): ExerciseVideo {
    return new ExerciseVideo({ ...snapshot });
  }

  get fileId(): string {
    return this.snapshot.fileId;
  }

  get mediaType(): string {
    return EXERCISE_VIDEO_MEDIA_TYPES[this.snapshot.format];
  }

  isStoredAs(fileId: string): boolean {
    return this.snapshot.fileId === fileId;
  }

  toSnapshot(): ExerciseVideoSnapshot {
    return { ...this.snapshot };
  }
}
