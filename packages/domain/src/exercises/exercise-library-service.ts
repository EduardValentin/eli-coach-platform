import type { StoredFileDigest } from "../stored-files";
import type { Exercise, ExerciseDraft, ExerciseVideo } from "./exercise-model";
import type { ExerciseRepository } from "./exercise-repository";
import {
  buildExerciseVideoAssetKey,
  EXERCISE_VIDEO_MIME_TYPE,
  hasExerciseVideoExtension,
  MAX_EXERCISE_VIDEO_BYTES,
  resolveExerciseVideoFormat,
} from "./exercise-video-format";
import type { ExerciseVideoStore } from "./exercise-video-store";

export type ExerciseVideoInput =
  | { kind: "keep" }
  | { kind: "remove" }
  | { kind: "replace"; bytes: Uint8Array; filename: string };

export type SaveExerciseCommand = {
  draft: ExerciseDraft;
  video: ExerciseVideoInput;
};

export type ExerciseIssue =
  | { code: "unsupported_video_content" }
  | { code: "video_too_large"; maxBytes: number; sizeBytes: number };

export type ListExercisesResult =
  | { status: "available"; exercises: readonly Exercise[] }
  | { status: "unavailable" };

export type GetExerciseResult =
  | { status: "available"; exercise: Exercise }
  | { status: "not_found" }
  | { status: "unavailable" };

export type SaveExerciseResult =
  | { status: "saved"; exercise: Exercise }
  | { status: "invalid"; issues: readonly ExerciseIssue[] }
  | { status: "not_found" }
  | { status: "unavailable" };

export type ExerciseVideoResult =
  | { status: "available"; video: ExerciseVideo }
  | { status: "not_found" }
  | { status: "unavailable" };

type VideoPlan =
  | { status: "planned"; video: ExerciseVideo }
  | { status: "invalid"; issues: readonly ExerciseIssue[] };

type VideoResolution =
  | { status: "resolved"; video: ExerciseVideo | null }
  | { status: "invalid"; issues: readonly ExerciseIssue[] };

type ExerciseLibraryServiceOptions = {
  digest: StoredFileDigest;
  repository: ExerciseRepository;
  videoStore: ExerciseVideoStore;
};

export class ExerciseLibraryService {
  private readonly digest: StoredFileDigest;
  private readonly repository: ExerciseRepository;
  private readonly videoStore: ExerciseVideoStore;

  constructor(options: ExerciseLibraryServiceOptions) {
    this.digest = options.digest;
    this.repository = options.repository;
    this.videoStore = options.videoStore;
  }

  async listExercises(): Promise<ListExercisesResult> {
    try {
      return {
        status: "available",
        exercises: await this.repository.listExercises(),
      };
    } catch {
      return { status: "unavailable" };
    }
  }

  async getExercise(id: string): Promise<GetExerciseResult> {
    try {
      const exercise = await this.repository.findExerciseById(id);

      return exercise
        ? { status: "available", exercise }
        : { status: "not_found" };
    } catch {
      return { status: "unavailable" };
    }
  }

  async getVideoByAssetKey(assetKey: string): Promise<ExerciseVideoResult> {
    try {
      const video = await this.repository.findVideoByAssetKey(assetKey);

      return video ? { status: "available", video } : { status: "not_found" };
    } catch {
      return { status: "unavailable" };
    }
  }

  async createExercise(command: SaveExerciseCommand): Promise<SaveExerciseResult> {
    try {
      const video = await this.resolveVideo(command.video, null);

      if (video.status === "invalid") {
        return video;
      }

      return {
        status: "saved",
        exercise: await this.repository.insertExercise({
          ...command.draft,
          video: video.video,
        }),
      };
    } catch {
      return { status: "unavailable" };
    }
  }

  async updateExercise(
    id: string,
    command: SaveExerciseCommand,
  ): Promise<SaveExerciseResult> {
    try {
      const existing = await this.repository.findExerciseById(id);

      if (!existing) {
        return { status: "not_found" };
      }

      const video = await this.resolveVideo(command.video, existing.video);

      if (video.status === "invalid") {
        return video;
      }

      const exercise = await this.repository.updateExercise(id, {
        ...command.draft,
        video: video.video,
      });

      return exercise ? { status: "saved", exercise } : { status: "not_found" };
    } catch {
      return { status: "unavailable" };
    }
  }

  /**
   * Writes the file only once the bytes have passed every rule, and before the
   * row commits: nothing references the file until then, and a file whose key
   * is its own digest is safe to leave behind if the row never lands.
   */
  private async resolveVideo(
    input: ExerciseVideoInput,
    current: ExerciseVideo | null,
  ): Promise<VideoResolution> {
    if (input.kind === "keep") {
      return { status: "resolved", video: current };
    }

    if (input.kind === "remove") {
      return { status: "resolved", video: null };
    }

    const plan = this.planVideo(input.bytes, input.filename);

    if (plan.status === "invalid") {
      return plan;
    }

    await this.videoStore.write({
      assetKey: plan.video.assetKey,
      bytes: input.bytes,
    });

    return { status: "resolved", video: plan.video };
  }

  private planVideo(bytes: Uint8Array, filename: string): VideoPlan {
    if (bytes.byteLength > MAX_EXERCISE_VIDEO_BYTES) {
      return {
        status: "invalid",
        issues: [
          {
            code: "video_too_large",
            maxBytes: MAX_EXERCISE_VIDEO_BYTES,
            sizeBytes: bytes.byteLength,
          },
        ],
      };
    }

    if (
      !hasExerciseVideoExtension(filename) ||
      resolveExerciseVideoFormat(bytes).status !== "resolved"
    ) {
      return {
        status: "invalid",
        issues: [{ code: "unsupported_video_content" }],
      };
    }

    const sha256 = this.digest.sha256(bytes);

    return {
      status: "planned",
      video: {
        assetKey: buildExerciseVideoAssetKey(sha256),
        mimeType: EXERCISE_VIDEO_MIME_TYPE,
        sizeBytes: bytes.byteLength,
        sha256,
      },
    };
  }
}
