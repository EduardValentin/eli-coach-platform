import { describe, expect, it, vi } from "vitest";

import { MAX_EXERCISE_VIDEO_BYTES } from "./exercise-video";
import type {
  ExerciseVideoStorePort,
  StagedExerciseVideo,
} from "./exercise-video-store-port";
import { StageExerciseVideoUseCase } from "./stage-exercise-video-use-case";

const STAGED: StagedExerciseVideo = {
  stagingId: "staging-1",
  sizeBytes: 2_048,
  leadingBytes: new Uint8Array([0, 0, 0, 24]),
};

function createUseCase() {
  const store = {
    receive: vi.fn(async (): Promise<StagedExerciseVideo> => STAGED),
    discard: vi.fn(async () => undefined),
  } satisfies Pick<ExerciseVideoStorePort, "receive" | "discard">;

  return {
    stageExerciseVideoUseCase: new StageExerciseVideoUseCase({
      exerciseVideoStorePort: store,
    }),
    store,
  };
}

async function* bytesOf(...chunks: number[][]): AsyncIterable<Uint8Array> {
  for (const chunk of chunks) {
    yield new Uint8Array(chunk);
  }
}

describe("StageExerciseVideoUseCase", () => {
  it("receives the incoming video counting one byte past the cap, so a larger file is judged too large", async () => {
    // arrange
    const { stageExerciseVideoUseCase, store } = createUseCase();
    const bytes = bytesOf([1, 2], [3]);

    // act
    const staged = await stageExerciseVideoUseCase.execute(bytes);

    // assert
    expect(staged).toEqual(STAGED);
    expect(store.receive).toHaveBeenCalledWith(
      bytes,
      MAX_EXERCISE_VIDEO_BYTES + 1,
    );
  });

  it("discards a staged video by its staging id", async () => {
    // arrange
    const { stageExerciseVideoUseCase, store } = createUseCase();

    // act
    await stageExerciseVideoUseCase.discard(STAGED);

    // assert
    expect(store.discard).toHaveBeenCalledWith("staging-1");
  });
});
