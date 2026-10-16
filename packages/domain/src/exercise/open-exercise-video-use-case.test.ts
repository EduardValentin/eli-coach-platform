import { describe, expect, it, vi } from "vitest";

import { Exercise, type ExerciseSnapshot } from "./exercise";
import type { ExerciseLibrary, ExerciseReference } from "./exercise-library";
import type {
  ExerciseVideoOpening,
  ExerciseVideoStore,
} from "./exercise-video-store";
import type { ExerciseVideoViewer } from "./exercise-video-viewer";
import { OpenExerciseVideoUseCase } from "./open-exercise-video-use-case";

const STORED_AT = new Date("2026-10-15T09:00:00.000Z");
const COACH_ACCOUNT_ID = "c0000000-0000-4000-8000-000000000001";
const COACH: ExerciseVideoViewer = {
  kind: "coach",
  accountId: COACH_ACCOUNT_ID,
};

const SQUAT: ExerciseSnapshot = {
  id: "e0000000-0000-4000-8000-000000000001",
  ownerAccountId: COACH_ACCOUNT_ID,
  name: "Back squat",
  type: "resistance",
  unit: "reps",
  perSide: false,
  primaryMuscles: ["Quadriceps"],
  secondaryMuscles: [],
  equipment: [],
  difficulty: "Beginner",
  tags: [],
  cues: "",
  video: {
    videoId: "9c1b0000-0000-4000-8000-000000000001",
    format: "mov",
    sizeBytes: 4_096,
  },
  createdAt: STORED_AT,
  updatedAt: STORED_AT,
};

const BYTES: AsyncIterable<Uint8Array> = {
  async *[Symbol.asyncIterator]() {
    yield new Uint8Array([1, 2, 3]);
  },
};

function createUseCase(snapshot: ExerciseSnapshot | null = SQUAT) {
  const library = {
    find: vi.fn(async ({ ownerAccountId, exerciseId }: ExerciseReference) =>
      snapshot?.ownerAccountId === ownerAccountId && snapshot.id === exerciseId
        ? Exercise.reconstitute(snapshot)
        : null,
    ),
  } satisfies Pick<ExerciseLibrary, "find">;
  const store = {
    open: vi.fn(async (): Promise<ExerciseVideoOpening> => ({
      status: "opened",
      bytes: BYTES,
      sizeBytes: 4_096,
      served: { start: 0, end: 2 },
    })),
  } satisfies Pick<ExerciseVideoStore, "open">;

  return {
    useCase: new OpenExerciseVideoUseCase({ library, store }),
    library,
    store,
  };
}

describe("OpenExerciseVideoUseCase", () => {
  it("opens the requested range of the current video for the coach, in its stored media type", async () => {
    // arrange
    const { useCase, store } = createUseCase();
    const requested = { kind: "from", start: 0, end: 2 } as const;

    // act
    const result = await useCase.execute({
      viewer: COACH,
      exerciseId: "e0000000-0000-4000-8000-000000000001",
      videoId: "9c1b0000-0000-4000-8000-000000000001",
      requested,
    });

    // assert
    expect(result).toEqual({
      status: "opened",
      mediaType: "video/quicktime",
      bytes: BYTES,
      sizeBytes: 4_096,
      served: { start: 0, end: 2 },
    });
    expect(store.open).toHaveBeenCalledWith(
      "9c1b0000-0000-4000-8000-000000000001",
      requested,
    );
  });

  it("looks for the exercise in the coach's own library", async () => {
    // arrange
    const { useCase, library } = createUseCase();

    // act
    await useCase.execute({
      viewer: COACH,
      exerciseId: "e0000000-0000-4000-8000-000000000001",
      videoId: "9c1b0000-0000-4000-8000-000000000001",
      requested: null,
    });

    // assert
    expect(library.find).toHaveBeenCalledExactlyOnceWith({
      ownerAccountId: COACH_ACCOUNT_ID,
      exerciseId: "e0000000-0000-4000-8000-000000000001",
    });
  });

  it("answers not found to another coach without opening the file", async () => {
    // arrange
    const { useCase, store } = createUseCase();

    // act
    const result = await useCase.execute({
      viewer: {
        kind: "coach",
        accountId: "c0000000-0000-4000-8000-000000000002",
      },
      exerciseId: "e0000000-0000-4000-8000-000000000001",
      videoId: "9c1b0000-0000-4000-8000-000000000001",
      requested: null,
    });

    // assert
    expect(result).toEqual({ status: "not-found" });
    expect(store.open).not.toHaveBeenCalled();
  });

  it("passes an unsatisfiable range through with the video's size", async () => {
    // arrange
    const { useCase, store } = createUseCase();
    store.open.mockResolvedValueOnce({
      status: "unsatisfiable",
      sizeBytes: 4_096,
    });

    // act
    const result = await useCase.execute({
      viewer: COACH,
      exerciseId: "e0000000-0000-4000-8000-000000000001",
      videoId: "9c1b0000-0000-4000-8000-000000000001",
      requested: { kind: "from", start: 9_000, end: null },
    });

    // assert
    expect(result).toEqual({ status: "unsatisfiable", sizeBytes: 4_096 });
  });

  it.each<{ viewer: ExerciseVideoViewer }>([
    { viewer: { kind: "client", authSubjectId: "user_1" } },
    { viewer: { kind: "visitor" } },
  ])(
    "answers not found to a $viewer.kind without opening the file",
    async ({ viewer }) => {
      // arrange
      const { useCase, library, store } = createUseCase();

      // act
      const result = await useCase.execute({
        viewer,
        exerciseId: "e0000000-0000-4000-8000-000000000001",
        videoId: "9c1b0000-0000-4000-8000-000000000001",
        requested: null,
      });

      // assert
      expect(result).toEqual({ status: "not-found" });
      expect(library.find).not.toHaveBeenCalled();
      expect(store.open).not.toHaveBeenCalled();
    },
  );

  it("answers not found for a video id that is no longer the exercise's video", async () => {
    // arrange
    const { useCase, store } = createUseCase();

    // act
    const result = await useCase.execute({
      viewer: COACH,
      exerciseId: "e0000000-0000-4000-8000-000000000001",
      videoId: "9c1b0000-0000-4000-8000-000000000000",
      requested: null,
    });

    // assert
    expect(result).toEqual({ status: "not-found" });
    expect(store.open).not.toHaveBeenCalled();
  });

  it("answers not found for an exercise without a video", async () => {
    // arrange
    const { useCase } = createUseCase({ ...SQUAT, video: null });

    // act
    const result = await useCase.execute({
      viewer: COACH,
      exerciseId: "e0000000-0000-4000-8000-000000000001",
      videoId: "9c1b0000-0000-4000-8000-000000000001",
      requested: null,
    });

    // assert
    expect(result).toEqual({ status: "not-found" });
  });

  it("answers not found for a missing exercise", async () => {
    // arrange
    const { useCase } = createUseCase(null);

    // act
    const result = await useCase.execute({
      viewer: COACH,
      exerciseId: "e0000000-0000-4000-8000-000000000009",
      videoId: "9c1b0000-0000-4000-8000-000000000001",
      requested: null,
    });

    // assert
    expect(result).toEqual({ status: "not-found" });
  });

  it("answers not found when the stored file has gone", async () => {
    // arrange
    const { useCase, store } = createUseCase();
    store.open.mockResolvedValueOnce({ status: "missing" });

    // act
    const result = await useCase.execute({
      viewer: COACH,
      exerciseId: "e0000000-0000-4000-8000-000000000001",
      videoId: "9c1b0000-0000-4000-8000-000000000001",
      requested: null,
    });

    // assert
    expect(result).toEqual({ status: "not-found" });
  });
});
