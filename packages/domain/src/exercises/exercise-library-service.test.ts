import { describe, expect, it, vi } from "vitest";

import { ExerciseLibraryService } from "./exercise-library-service";
import type { Exercise } from "./exercise-model";
import type {
  ExerciseRepository,
  PersistExerciseCommand,
} from "./exercise-repository";
import { MAX_EXERCISE_VIDEO_BYTES } from "./exercise-video-format";

/** An `ftyp` box (isom, mp42) followed by an empty `mdat` box. */
const MP4 = new Uint8Array([
  0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d,
  0x00, 0x00, 0x02, 0x00, 0x69, 0x73, 0x6f, 0x6d, 0x6d, 0x70, 0x34, 0x32,
  0x00, 0x00, 0x00, 0x08, 0x6d, 0x64, 0x61, 0x74,
]);
const DIGEST = "f".repeat(64);
const draft = {
  name: "Back Squat",
  description: "",
  difficulty: "Intermediate",
  equipment: ["Barbell"],
  primaryMuscles: ["Quadriceps"],
  secondaryMuscles: ["Glutes"],
  tags: ["Strength"],
} as const;

function createRepository(seed: Exercise[] = []): ExerciseRepository {
  const rows = [...seed];

  return {
    listExercises: vi.fn(async () => rows),
    findExerciseById: vi.fn(
      async (id: string) => rows.find((row) => row.id === id) ?? null,
    ),
    findVideoByAssetKey: vi.fn(
      async (assetKey: string) =>
        rows.find((row) => row.video?.assetKey === assetKey)?.video ?? null,
    ),
    insertExercise: vi.fn(async (command: PersistExerciseCommand) => {
      const row: Exercise = {
        ...command,
        id: `e${rows.length + 1}`,
        createdAt: new Date(0),
        updatedAt: new Date(0),
      };

      rows.push(row);

      return row;
    }),
    updateExercise: vi.fn(
      async (id: string, command: PersistExerciseCommand) => {
        const index = rows.findIndex((row) => row.id === id);

        if (index < 0) {
          return null;
        }

        rows[index] = { ...rows[index]!, ...command };

        return rows[index]!;
      },
    ),
  };
}

function createService(repository = createRepository()) {
  const writes: string[] = [];
  const service = new ExerciseLibraryService({
    digest: { sha256: () => DIGEST },
    repository,
    videoStore: {
      open: vi.fn(),
      write: vi.fn(async ({ assetKey }: { assetKey: string }) => {
        writes.push(assetKey);
      }),
    },
  });

  return { service, writes };
}

describe("ExerciseLibraryService", () => {
  it("creates an exercise without a video", async () => {
    // arrange
    const { service, writes } = createService();

    // act
    const result = await service.createExercise({
      draft,
      video: { kind: "keep" },
    });

    // assert
    expect(result).toMatchObject({
      status: "saved",
      exercise: { name: "Back Squat", video: null },
    });
    expect(writes).toEqual([]);
  });

  it("writes an MP4 under its digest and records it on the exercise", async () => {
    // arrange
    const { service, writes } = createService();

    // act
    const result = await service.createExercise({
      draft,
      video: { kind: "replace", bytes: MP4, filename: "squat.mp4" },
    });

    // assert
    expect(writes).toEqual([`exercise-videos/${DIGEST}.mp4`]);
    expect(result).toMatchObject({
      status: "saved",
      exercise: {
        video: {
          assetKey: `exercise-videos/${DIGEST}.mp4`,
          mimeType: "video/mp4",
          sizeBytes: MP4.byteLength,
          sha256: DIGEST,
        },
      },
    });
  });

  it("rejects a file that is not an MP4 by bytes or by name, writing nothing", async () => {
    // arrange
    const { service, writes } = createService();

    // act
    const byBytes = await service.createExercise({
      draft,
      video: { kind: "replace", bytes: new Uint8Array(20), filename: "clip.mp4" },
    });
    const byName = await service.createExercise({
      draft,
      video: { kind: "replace", bytes: MP4, filename: "clip.mov" },
    });

    // assert
    expect(byBytes).toEqual({
      status: "invalid",
      issues: [{ code: "unsupported_video_content" }],
    });
    expect(byName).toEqual({
      status: "invalid",
      issues: [{ code: "unsupported_video_content" }],
    });
    expect(writes).toEqual([]);
  });

  it("rejects a video over the size limit", async () => {
    // arrange
    const { service } = createService();
    const oversized = new Uint8Array(MAX_EXERCISE_VIDEO_BYTES + 1);
    oversized.set(MP4);

    // act
    const result = await service.createExercise({
      draft,
      video: { kind: "replace", bytes: oversized, filename: "big.mp4" },
    });

    // assert
    expect(result).toEqual({
      status: "invalid",
      issues: [
        {
          code: "video_too_large",
          maxBytes: MAX_EXERCISE_VIDEO_BYTES,
          sizeBytes: MAX_EXERCISE_VIDEO_BYTES + 1,
        },
      ],
    });
  });

  it("keeps, removes or replaces the stored video on update", async () => {
    // arrange
    const video = {
      assetKey: "exercise-videos/old.mp4",
      mimeType: "video/mp4",
      sizeBytes: 3,
      sha256: "e".repeat(64),
    };
    const repository = createRepository([
      { ...draft, id: "e1", video, createdAt: new Date(0), updatedAt: new Date(0) },
    ]);
    const { service } = createService(repository);

    // act
    const kept = await service.updateExercise("e1", {
      draft: { ...draft, name: "Low Bar Squat" },
      video: { kind: "keep" },
    });
    const removed = await service.updateExercise("e1", {
      draft,
      video: { kind: "remove" },
    });
    const replaced = await service.updateExercise("e1", {
      draft,
      video: { kind: "replace", bytes: MP4, filename: "new.mp4" },
    });
    const missing = await service.updateExercise("nope", {
      draft,
      video: { kind: "keep" },
    });

    // assert
    expect(kept).toMatchObject({
      status: "saved",
      exercise: { name: "Low Bar Squat", video },
    });
    expect(removed).toMatchObject({ status: "saved", exercise: { video: null } });
    expect(replaced).toMatchObject({
      status: "saved",
      exercise: { video: { sha256: DIGEST } },
    });
    expect(missing).toEqual({ status: "not_found" });
  });

  it("answers unavailable when persistence fails", async () => {
    // arrange
    const repository = createRepository();
    repository.listExercises = vi.fn().mockRejectedValue(new Error("down"));
    const { service } = createService(repository);

    // act
    const result = await service.listExercises();

    // assert
    expect(result).toEqual({ status: "unavailable" });
  });
});
