import { describe, expect, it, vi } from "vitest";

import { DeleteExerciseUseCase } from "./delete-exercise-use-case";
import { Exercise, type ExerciseSnapshot } from "./exercise";
import type {
  ExerciseLibrary,
  ExerciseReference,
  ExerciseRemoval,
} from "./exercise-library";
import type { ExerciseLibraryIncidents } from "./exercise-library-incidents";
import type { ExerciseVideoStore } from "./exercise-video-store";

const STORED_AT = new Date("2026-10-13T09:00:00.000Z");
const COACH_ACCOUNT_ID = "c0000000-0000-4000-8000-000000000001";
const OTHER_COACH_ACCOUNT_ID = "c0000000-0000-4000-8000-000000000002";
const HIP_THRUST_ID = "e0000000-0000-4000-8000-000000000001";
const LUNGE_ID = "e0000000-0000-4000-8000-000000000002";
const VIDEO_ID = "9c1b0000-0000-4000-8000-000000000001";

const HIP_THRUST: ExerciseSnapshot = {
  id: HIP_THRUST_ID,
  ownerAccountId: COACH_ACCOUNT_ID,
  name: "Hip thrust",
  type: "resistance",
  unit: "reps",
  perSide: false,
  primaryMuscles: ["Glutes"],
  secondaryMuscles: [],
  equipment: ["Barbell"],
  difficulty: "Beginner",
  tags: [],
  cues: "",
  video: { videoId: VIDEO_ID, format: "mp4", sizeBytes: 2_048 },
  archivedAt: null,
  createdAt: STORED_AT,
  updatedAt: STORED_AT,
};

const LUNGE: ExerciseSnapshot = {
  ...HIP_THRUST,
  id: LUNGE_ID,
  name: "Lunge",
  video: null,
};

function createUseCase() {
  const stored = [
    Exercise.reconstitute(HIP_THRUST),
    Exercise.reconstitute(LUNGE),
  ];
  const library = {
    find: vi.fn(
      async ({
        ownerAccountId,
        exerciseId,
      }: ExerciseReference): Promise<Exercise | null> =>
        stored.find(
          (exercise) =>
            exercise.id === exerciseId &&
            exercise.toSnapshot().ownerAccountId === ownerAccountId,
        ) ?? null,
    ),
    remove: vi.fn(
      async (_reference: ExerciseReference): Promise<ExerciseRemoval> =>
        "removed",
    ),
  } satisfies Pick<ExerciseLibrary, "find" | "remove">;
  const store = {
    remove: vi.fn(async (_videoId: string) => undefined),
  } satisfies Pick<ExerciseVideoStore, "remove">;
  const incidents = {
    videoCleanupFailed: vi.fn(),
  } satisfies Pick<ExerciseLibraryIncidents, "videoCleanupFailed">;
  const useCase = new DeleteExerciseUseCase({ library, store, incidents });

  return { useCase, library, store, incidents };
}

describe("DeleteExerciseUseCase", () => {
  it("deletes her exercise and then its video file", async () => {
    // arrange
    const { useCase, library, store } = createUseCase();

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      exerciseId: HIP_THRUST_ID,
    });

    // assert
    expect(result).toEqual({
      status: "deleted",
      exercise: Exercise.reconstitute(HIP_THRUST),
    });
    expect(library.remove).toHaveBeenCalledExactlyOnceWith({
      ownerAccountId: COACH_ACCOUNT_ID,
      exerciseId: HIP_THRUST_ID,
    });
    expect(store.remove).toHaveBeenCalledExactlyOnceWith(VIDEO_ID);
    expect(library.remove.mock.invocationCallOrder[0]).toBeLessThan(
      store.remove.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it("deletes an exercise without a video, removing no file", async () => {
    // arrange
    const { useCase, store } = createUseCase();

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      exerciseId: LUNGE_ID,
    });

    // assert
    expect(result).toEqual({
      status: "deleted",
      exercise: Exercise.reconstitute(LUNGE),
    });
    expect(store.remove).not.toHaveBeenCalled();
  });

  it("reports a video file it could not remove and still answers the exercise deleted", async () => {
    // arrange
    const failure = new Error("disk unavailable");
    const { useCase, store, incidents } = createUseCase();
    store.remove.mockRejectedValueOnce(failure);

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      exerciseId: HIP_THRUST_ID,
    });

    // assert
    expect(result.status).toBe("deleted");
    expect(incidents.videoCleanupFailed).toHaveBeenCalledExactlyOnceWith({
      videoId: VIDEO_ID,
      error: failure,
    });
  });

  it("finds nothing to delete when the exercise is gone before it is removed", async () => {
    // arrange
    const { useCase, library, store } = createUseCase();
    library.remove.mockResolvedValueOnce("missing");

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      exerciseId: HIP_THRUST_ID,
    });

    // assert
    expect(result).toEqual({ status: "not-found" });
    expect(store.remove).not.toHaveBeenCalled();
  });

  it("finds nothing to delete for an unknown exercise", async () => {
    // arrange
    const { useCase, library, store } = createUseCase();

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      exerciseId: "e0000000-0000-4000-8000-000000000404",
    });

    // assert
    expect(result).toEqual({ status: "not-found" });
    expect(library.remove).not.toHaveBeenCalled();
    expect(store.remove).not.toHaveBeenCalled();
  });

  it("finds nothing to delete in another coach's library", async () => {
    // arrange
    const { useCase, library, store } = createUseCase();

    // act
    const result = await useCase.execute({
      ownerAccountId: OTHER_COACH_ACCOUNT_ID,
      exerciseId: HIP_THRUST_ID,
    });

    // assert
    expect(result).toEqual({ status: "not-found" });
    expect(library.remove).not.toHaveBeenCalled();
    expect(store.remove).not.toHaveBeenCalled();
  });
});
