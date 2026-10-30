import { describe, expect, it, vi } from "vitest";

import type { ExerciseLibraryIncidentsPort } from "./exercise-library-incidents-port";
import { ExerciseVideo } from "./exercise-video";
import { ExerciseVideoCleanup } from "./exercise-video-cleanup";
import type {
  ExerciseVideoStorePort,
  StagedExerciseVideo,
} from "./exercise-video-store-port";

const VIDEO_ID = "9c1b0000-0000-4000-8000-000000000001";

const STAGED: StagedExerciseVideo = {
  stagingId: "staged-hip-thrust",
  sizeBytes: 2_048,
  leadingBytes: new Uint8Array(),
};

function createCleanup() {
  const store = {
    discard: vi.fn(async (_stagingId: string) => undefined),
    remove: vi.fn(async (_videoId: string) => undefined),
  } satisfies Pick<ExerciseVideoStorePort, "discard" | "remove">;
  const incidents = {
    videoCleanupFailed: vi.fn(),
  } satisfies Pick<ExerciseLibraryIncidentsPort, "videoCleanupFailed">;
  const cleanup = new ExerciseVideoCleanup({ store, incidents });

  return { cleanup, store, incidents };
}

describe("ExerciseVideoCleanup.removeStored", () => {
  it("removes the stored video file", async () => {
    // arrange
    const { cleanup, store, incidents } = createCleanup();

    // act
    await cleanup.removeStored(storedVideo());

    // assert
    expect(store.remove).toHaveBeenCalledExactlyOnceWith(VIDEO_ID);
    expect(incidents.videoCleanupFailed).not.toHaveBeenCalled();
  });

  it("removes nothing when there is no video", async () => {
    // arrange
    const { cleanup, store } = createCleanup();

    // act
    await cleanup.removeStored(null);

    // assert
    expect(store.remove).not.toHaveBeenCalled();
  });

  it("reports a stored video file it could not remove", async () => {
    // arrange
    const failure = new Error("disk unavailable");
    const { cleanup, store, incidents } = createCleanup();
    store.remove.mockRejectedValueOnce(failure);

    // act
    await cleanup.removeStored(storedVideo());

    // assert
    expect(incidents.videoCleanupFailed).toHaveBeenCalledExactlyOnceWith({
      videoId: VIDEO_ID,
      error: failure,
    });
  });
});

describe("ExerciseVideoCleanup.discardStaged", () => {
  it("discards the staged upload", async () => {
    // arrange
    const { cleanup, store, incidents } = createCleanup();

    // act
    await cleanup.discardStaged(STAGED);

    // assert
    expect(store.discard).toHaveBeenCalledExactlyOnceWith(STAGED.stagingId);
    expect(incidents.videoCleanupFailed).not.toHaveBeenCalled();
  });

  it("reports a staged upload it could not discard", async () => {
    // arrange
    const failure = new Error("disk unavailable");
    const { cleanup, store, incidents } = createCleanup();
    store.discard.mockRejectedValueOnce(failure);

    // act
    await cleanup.discardStaged(STAGED);

    // assert
    expect(incidents.videoCleanupFailed).toHaveBeenCalledExactlyOnceWith({
      stagingId: STAGED.stagingId,
      error: failure,
    });
  });
});

function storedVideo(): ExerciseVideo {
  return ExerciseVideo.fromStored({
    videoId: VIDEO_ID,
    format: "mp4",
    sizeBytes: 2_048,
  });
}
