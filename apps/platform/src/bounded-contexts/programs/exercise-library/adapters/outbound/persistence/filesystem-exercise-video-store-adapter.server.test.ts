import { randomBytes, randomUUID } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  symlink,
  writeFile,
  type FileHandle,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { RequestedByteRange } from "~/bounded-contexts/programs/exercise-library/domain/exercise";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FilesystemExerciseVideoStoreAdapter } from "./filesystem-exercise-video-store-adapter.server";

const openedFiles = vi.hoisted((): FileHandle[] => []);

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();

  return {
    ...actual,
    open: async (...args: Parameters<typeof actual.open>) => {
      const file = await actual.open(...args);
      openedFiles.push(file);

      return file;
    },
  };
});

const CLOSED_DESCRIPTOR = -1;
const LEADING_BYTE_COUNT = 4100;
const VIDEO = randomBytes(256 * 1024);
const LOCATION_LEAVES_ROOT = "Exercise video location leaves the storage root.";
const HOSTILE_IDS = ["..", "a/b", ""];
const VIDEO_ID = "9c1b0000-0000-4000-8000-000000000001";

type Source = { bytes: AsyncIterable<Uint8Array>; drained: () => boolean };

function sourceOf(...chunks: readonly Uint8Array[]): Source {
  let drained = false;

  async function* bytes() {
    for (const chunk of chunks) {
      yield chunk;
    }
    drained = true;
  }

  return { bytes: bytes(), drained: () => drained };
}

function chunksOf(bytes: Buffer, chunkSize: number): Buffer[] {
  const chunks: Buffer[] = [];

  for (let start = 0; start < bytes.byteLength; start += chunkSize) {
    chunks.push(bytes.subarray(start, start + chunkSize));
  }

  return chunks;
}

async function* failingSource(): AsyncIterable<Uint8Array> {
  yield randomBytes(1000);
  throw new Error("The upload was cut off.");
}

async function readAll(bytes: AsyncIterable<Uint8Array>): Promise<Buffer> {
  const chunks: Uint8Array[] = [];

  for await (const chunk of bytes) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

function everyOpenedFileIsClosed(): boolean {
  return openedFiles.every((file) => file.fd === CLOSED_DESCRIPTOR);
}

describe("FilesystemExerciseVideoStoreAdapter", () => {
  let workspace: string;
  let root: string;
  let filesystemExerciseVideoStoreAdapter: FilesystemExerciseVideoStoreAdapter;

  beforeEach(async () => {
    openedFiles.length = 0;
    workspace = await mkdtemp(join(tmpdir(), "exercise-video-store-"));
    root = join(workspace, "videos-root");
    await mkdir(root);
    filesystemExerciseVideoStoreAdapter =
      new FilesystemExerciseVideoStoreAdapter(root);
  });

  afterEach(async () => {
    await rm(workspace, { recursive: true, force: true });
  });

  async function keptVideo(bytes: Buffer): Promise<string> {
    const staged = await filesystemExerciseVideoStoreAdapter.receive(
      sourceOf(bytes).bytes,
      bytes.length,
    );
    const videoId = randomUUID();
    await filesystemExerciseVideoStoreAdapter.keep(staged.stagingId, videoId);

    return videoId;
  }

  describe("receiving", () => {
    it("writes the received bytes to an incoming file and answers their size and leading bytes", async () => {
      // arrange
      const source = sourceOf(...chunksOf(VIDEO, 1000));

      // act
      const staged = await filesystemExerciseVideoStoreAdapter.receive(
        source.bytes,
        VIDEO.length + 1,
      );

      // assert
      expect(staged.sizeBytes).toBe(VIDEO.length);
      expect(Buffer.from(staged.leadingBytes)).toEqual(
        VIDEO.subarray(0, LEADING_BYTE_COUNT),
      );
      expect(await readFile(join(root, ".incoming", staged.stagingId))).toEqual(
        VIDEO,
      );
      expect(everyOpenedFileIsClosed()).toBe(true);
    });

    it("answers every byte as the leading bytes of a file shorter than them", async () => {
      // arrange
      const short = randomBytes(100);

      // act
      const staged = await filesystemExerciseVideoStoreAdapter.receive(
        sourceOf(short).bytes,
        1000,
      );

      // assert
      expect(staged.sizeBytes).toBe(100);
      expect(Buffer.from(staged.leadingBytes)).toEqual(short);
    });

    it("writes only up to the count, drains the rest of the source and answers the count", async () => {
      // arrange
      const source = sourceOf(...chunksOf(VIDEO, 1000));
      const countUpTo = 2500;

      // act
      const staged = await filesystemExerciseVideoStoreAdapter.receive(
        source.bytes,
        countUpTo,
      );

      // assert
      expect(staged.sizeBytes).toBe(countUpTo);
      expect(source.drained()).toBe(true);
      expect(await readFile(join(root, ".incoming", staged.stagingId))).toEqual(
        VIDEO.subarray(0, countUpTo),
      );
    });

    it("leaves no incoming file and rethrows when the source fails midway", async () => {
      // arrange
      // act
      const receiving = filesystemExerciseVideoStoreAdapter.receive(
        failingSource(),
        10_000,
      );

      // assert
      await expect(receiving).rejects.toThrow("The upload was cut off.");
      expect(await readdir(join(root, ".incoming"))).toEqual([]);
      expect(everyOpenedFileIsClosed()).toBe(true);
    });

    it("refuses to receive into an incoming folder linked outside the storage root", async () => {
      // arrange
      const outside = join(workspace, "outside");
      await mkdir(outside);
      await symlink(outside, join(root, ".incoming"));

      // act
      const receiving = filesystemExerciseVideoStoreAdapter.receive(
        sourceOf(VIDEO).bytes,
        VIDEO.length,
      );

      // assert
      await expect(receiving).rejects.toThrow(LOCATION_LEAVES_ROOT);
      expect(await readdir(outside)).toEqual([]);
    });
  });

  describe("keeping and discarding", () => {
    it("moves a staged video under the file id it is given and forgets the staging id", async () => {
      // arrange
      const staged = await filesystemExerciseVideoStoreAdapter.receive(
        sourceOf(VIDEO).bytes,
        VIDEO.length,
      );

      // act
      await filesystemExerciseVideoStoreAdapter.keep(
        staged.stagingId,
        VIDEO_ID,
      );

      // assert
      expect(await readdir(join(root, "videos"))).toEqual([VIDEO_ID]);
      expect(await readFile(join(root, "videos", VIDEO_ID))).toEqual(VIDEO);
      expect(await readdir(join(root, ".incoming"))).toEqual([]);
      expect(everyOpenedFileIsClosed()).toBe(true);
    });

    it("refuses to keep a staged video under an id already stored and leaves the stored file and the staged one in place", async () => {
      // arrange
      const stored = randomBytes(1024);
      const first = await filesystemExerciseVideoStoreAdapter.receive(
        sourceOf(stored).bytes,
        stored.length,
      );
      await filesystemExerciseVideoStoreAdapter.keep(first.stagingId, VIDEO_ID);
      const staged = await filesystemExerciseVideoStoreAdapter.receive(
        sourceOf(VIDEO).bytes,
        VIDEO.length,
      );

      // act
      const keeping = filesystemExerciseVideoStoreAdapter.keep(
        staged.stagingId,
        VIDEO_ID,
      );

      // assert
      await expect(keeping).rejects.toMatchObject({ code: "EEXIST" });
      expect(await readFile(join(root, "videos", VIDEO_ID))).toEqual(stored);
      expect(await readdir(join(root, ".incoming"))).toEqual([
        staged.stagingId,
      ]);
      await filesystemExerciseVideoStoreAdapter.discard(staged.stagingId);
      expect(await readdir(join(root, ".incoming"))).toEqual([]);
    });

    it("discards a staged video", async () => {
      // arrange
      const staged = await filesystemExerciseVideoStoreAdapter.receive(
        sourceOf(VIDEO).bytes,
        VIDEO.length,
      );

      // act
      await filesystemExerciseVideoStoreAdapter.discard(staged.stagingId);

      // assert
      expect(await readdir(join(root, ".incoming"))).toEqual([]);
    });

    it("removes a kept video and leaves the other videos alone", async () => {
      // arrange
      const videoId = await keptVideo(VIDEO);
      const otherId = await keptVideo(VIDEO);

      // act
      await filesystemExerciseVideoStoreAdapter.remove(videoId);

      // assert
      expect(await readdir(join(root, "videos"))).toEqual([otherId]);
      expect(
        await filesystemExerciseVideoStoreAdapter.open(videoId, null),
      ).toEqual({ status: "missing" });
    });

    it("discards and removes what is not there without failing", async () => {
      // arrange
      const videoId = await keptVideo(VIDEO);
      await filesystemExerciseVideoStoreAdapter.remove(videoId);

      // act
      const outcomes = await Promise.allSettled([
        filesystemExerciseVideoStoreAdapter.remove(videoId),
        filesystemExerciseVideoStoreAdapter.discard("never-staged"),
        new FilesystemExerciseVideoStoreAdapter(
          join(workspace, "empty"),
        ).remove("never-kept"),
      ]);

      // assert
      expect(outcomes.map((outcome) => outcome.status)).toEqual([
        "fulfilled",
        "fulfilled",
        "fulfilled",
      ]);
    });
  });

  describe("opening", () => {
    it.each<{
      requested: RequestedByteRange | null;
      served: { start: number; end: number } | "whole";
    }>([
      { requested: null, served: "whole" },
      {
        requested: { kind: "from", start: 100, end: 199 },
        served: { start: 100, end: 199 },
      },
      {
        requested: { kind: "from", start: 0, end: 0 },
        served: { start: 0, end: 0 },
      },
      {
        requested: { kind: "from", start: 1000, end: null },
        served: { start: 1000, end: VIDEO.length - 1 },
      },
      {
        requested: { kind: "from", start: 1000, end: VIDEO.length + 50 },
        served: { start: 1000, end: VIDEO.length - 1 },
      },
      {
        requested: { kind: "suffix", length: 500 },
        served: { start: VIDEO.length - 500, end: VIDEO.length - 1 },
      },
      {
        requested: { kind: "suffix", length: VIDEO.length + 500 },
        served: { start: 0, end: VIDEO.length - 1 },
      },
    ])(
      "serves $requested as $served with the whole file's size",
      async ({ requested, served }) => {
        // arrange
        const videoId = await keptVideo(VIDEO);
        const expected =
          served === "whole"
            ? VIDEO
            : VIDEO.subarray(served.start, served.end + 1);

        // act
        const opening = await filesystemExerciseVideoStoreAdapter.open(
          videoId,
          requested,
        );

        // assert
        expect(opening).toMatchObject({
          status: "opened",
          sizeBytes: VIDEO.length,
          served,
        });
        expect(
          opening.status === "opened" && (await readAll(opening.bytes)),
        ).toEqual(expected);
        expect(everyOpenedFileIsClosed()).toBe(true);
      },
    );

    it.each<RequestedByteRange>([
      { kind: "from", start: VIDEO.length, end: null },
      { kind: "from", start: VIDEO.length + 10, end: VIDEO.length + 20 },
      { kind: "from", start: 200, end: 100 },
      { kind: "suffix", length: 0 },
    ])("answers the range %j as unsatisfiable", async (requested) => {
      // arrange
      const videoId = await keptVideo(VIDEO);

      // act
      const opening = await filesystemExerciseVideoStoreAdapter.open(
        videoId,
        requested,
      );

      // assert
      expect(opening).toEqual({
        status: "unsatisfiable",
        sizeBytes: VIDEO.length,
      });
    });

    it.each<RequestedByteRange>([
      { kind: "from", start: 0, end: null },
      { kind: "suffix", length: 10 },
    ])(
      "answers range %j of an empty video as unsatisfiable",
      async (requested) => {
        // arrange
        const videoId = await keptVideo(Buffer.alloc(0));

        // act
        const opening = await filesystemExerciseVideoStoreAdapter.open(
          videoId,
          requested,
        );

        // assert
        expect(opening).toEqual({ status: "unsatisfiable", sizeBytes: 0 });
      },
    );

    it("answers missing for a video that is not stored", async () => {
      // arrange
      await keptVideo(VIDEO);

      // act
      const opening = await filesystemExerciseVideoStoreAdapter.open(
        "never-kept",
        null,
      );

      // assert
      expect(opening).toEqual({ status: "missing" });
    });

    it("opens the video's file only once its bytes are first pulled", async () => {
      // arrange
      const videoId = await keptVideo(VIDEO);
      openedFiles.length = 0;

      // act
      const opening = await filesystemExerciseVideoStoreAdapter.open(
        videoId,
        null,
      );
      const openedBeforePulling = openedFiles.length;
      const firstChunk =
        opening.status === "opened" &&
        (await opening.bytes[Symbol.asyncIterator]().next());

      // assert
      expect(openedBeforePulling).toBe(0);
      expect(firstChunk).toMatchObject({ done: false });
      expect(openedFiles).toHaveLength(1);
    });

    it("releases the video's file when the reader stops after the first chunk", async () => {
      // arrange
      const videoId = await keptVideo(VIDEO);
      const opening = await filesystemExerciseVideoStoreAdapter.open(
        videoId,
        null,
      );

      // act
      if (opening.status === "opened") {
        for await (const _chunk of opening.bytes) {
          break;
        }
      }

      // assert
      expect(opening.status).toBe("opened");
      expect(everyOpenedFileIsClosed()).toBe(true);
    });

    it("leaves no file open when the video is opened and dropped unread", async () => {
      // arrange
      const videoId = await keptVideo(VIDEO);
      openedFiles.length = 0;
      const opening = await filesystemExerciseVideoStoreAdapter.open(
        videoId,
        null,
      );

      // act
      if (opening.status === "opened") {
        await opening.bytes[Symbol.asyncIterator]().return?.();
      }

      // assert
      expect(opening.status).toBe("opened");
      expect(openedFiles).toEqual([]);
    });
  });

  it.each(HOSTILE_IDS)(
    "refuses the id %j before touching the disk",
    async (id) => {
      // arrange
      const calls = [
        () => filesystemExerciseVideoStoreAdapter.keep(id, VIDEO_ID),
        () => filesystemExerciseVideoStoreAdapter.keep(VIDEO_ID, id),
        () => filesystemExerciseVideoStoreAdapter.discard(id),
        () => filesystemExerciseVideoStoreAdapter.remove(id),
        () => filesystemExerciseVideoStoreAdapter.open(id, null),
      ];

      // act
      const outcomes = await Promise.allSettled(calls.map((call) => call()));

      // assert
      for (const outcome of outcomes) {
        expect(outcome).toMatchObject({
          status: "rejected",
          reason: new Error(LOCATION_LEAVES_ROOT),
        });
      }
      expect(await readdir(root)).toEqual([]);
      expect(openedFiles).toEqual([]);
    },
  );

  describe("with the videos folder linked outside the storage root", () => {
    let outside: string;

    beforeEach(async () => {
      outside = join(workspace, "outside");
      await mkdir(outside);
      await writeFile(join(outside, "video-1"), VIDEO);
      await symlink(outside, join(root, "videos"));
    });

    it("refuses to keep a staged video through it", async () => {
      // arrange
      const staged = await filesystemExerciseVideoStoreAdapter.receive(
        sourceOf(VIDEO).bytes,
        VIDEO.length,
      );

      // act
      const keeping = filesystemExerciseVideoStoreAdapter.keep(
        staged.stagingId,
        VIDEO_ID,
      );

      // assert
      await expect(keeping).rejects.toThrow(LOCATION_LEAVES_ROOT);
      expect(await readdir(outside)).toEqual(["video-1"]);
    });

    it("refuses to open a video through it", async () => {
      // arrange
      // act
      const opening = filesystemExerciseVideoStoreAdapter.open("video-1", null);

      // assert
      await expect(opening).rejects.toThrow(LOCATION_LEAVES_ROOT);
      expect(everyOpenedFileIsClosed()).toBe(true);
    });

    it("refuses to remove a video through it and leaves the linked file", async () => {
      // arrange
      // act
      const removing = filesystemExerciseVideoStoreAdapter.remove("video-1");

      // assert
      await expect(removing).rejects.toThrow(LOCATION_LEAVES_ROOT);
      expect(await readdir(outside)).toEqual(["video-1"]);
    });
  });

  it("refuses to open a video file linked from outside the storage root", async () => {
    // arrange
    const outsideFile = join(workspace, "outside-video");
    await writeFile(outsideFile, VIDEO);
    await mkdir(join(root, "videos"));
    await symlink(outsideFile, join(root, "videos", "video-1"));

    // act
    const opening = filesystemExerciseVideoStoreAdapter.open("video-1", null);

    // assert
    await expect(opening).rejects.toThrow(LOCATION_LEAVES_ROOT);
  });
});
