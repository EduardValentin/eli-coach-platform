import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createExerciseVideoStore } from "./create-exercise-video-store.server";

const RUNS_AS_SUPERUSER = process.getuid?.() === 0;

async function* sourceOf(bytes: Uint8Array): AsyncIterable<Uint8Array> {
  yield bytes;
}

describe("createExerciseVideoStore", () => {
  let workspace: string;

  beforeEach(async () => {
    workspace = await mkdtemp(join(tmpdir(), "exercise-video-factory-"));
  });

  afterEach(async () => {
    await chmod(workspace, 0o700);
    await rm(workspace, { recursive: true, force: true });
  });

  it("returns a store over a ready root", async () => {
    // arrange
    const video = Buffer.from([1, 2, 3]);

    // act
    const store = createExerciseVideoStore(workspace);

    // assert
    const staged = await store.receive(sourceOf(video), video.length);
    await store.keep(staged.stagingId, "9c1b0000-0000-4000-8000-000000000001");
    expect(
      await store.open("9c1b0000-0000-4000-8000-000000000001", {
        kind: "suffix",
        length: 1,
      }),
    ).toMatchObject({
      status: "opened",
      sizeBytes: video.length,
      served: { start: 2, end: 2 },
    });
  });

  it("refuses a root that does not exist", () => {
    // arrange
    const root = join(workspace, "missing");

    // act
    const create = () => createExerciseVideoStore(root);

    // assert
    expect(create).toThrow("Exercise video root is not ready.");
  });

  it("refuses a root that is a file", async () => {
    // arrange
    const file = join(workspace, "file");
    await writeFile(file, "not a directory");

    // act
    const create = () => createExerciseVideoStore(file);

    // assert
    expect(create).toThrow("Exercise video root is not ready.");
  });

  it.skipIf(RUNS_AS_SUPERUSER)(
    "refuses a root the process cannot write to",
    async () => {
      // arrange
      const readOnlyRoot = join(workspace, "read-only");
      await mkdir(readOnlyRoot, { mode: 0o500 });

      // act
      const create = () => createExerciseVideoStore(readOnlyRoot);

      // assert
      expect(create).toThrow("Exercise video root is not ready.");
    },
  );
});
