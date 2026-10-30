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

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FilesystemRecipePhotoStoreAdapter } from "./filesystem-recipe-photo-store-adapter.server";

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
const PHOTO = randomBytes(96 * 1024);
const LOCATION_LEAVES_ROOT = "Recipe photo location leaves the storage root.";
const HOSTILE_IDS = ["..", "a/b", ""];

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

describe("FilesystemRecipePhotoStore", () => {
  let workspace: string;
  let root: string;
  let filesystemRecipePhotoStoreAdapter: FilesystemRecipePhotoStoreAdapter;

  beforeEach(async () => {
    openedFiles.length = 0;
    workspace = await mkdtemp(join(tmpdir(), "recipe-photo-store-"));
    root = join(workspace, "photos-root");
    await mkdir(root);
    filesystemRecipePhotoStoreAdapter = new FilesystemRecipePhotoStoreAdapter(
      root,
    );
  });

  afterEach(async () => {
    await rm(workspace, { recursive: true, force: true });
  });

  async function storedPhoto(bytes: Buffer = PHOTO): Promise<string> {
    const photoId = randomUUID();
    await filesystemRecipePhotoStoreAdapter.store(photoId, bytes);

    return photoId;
  }

  describe("storing", () => {
    it("writes the photo under its id in the photos folder", async () => {
      // arrange
      const photoId = randomUUID();

      // act
      await filesystemRecipePhotoStoreAdapter.store(photoId, PHOTO);

      // assert
      expect(await readdir(join(root, "photos"))).toEqual([photoId]);
      expect(await readFile(join(root, "photos", photoId))).toEqual(PHOTO);
      expect(everyOpenedFileIsClosed()).toBe(true);
    });

    it("refuses to store a photo under an id already stored and leaves the stored file in place", async () => {
      // arrange
      const photoId = await storedPhoto();

      // act
      const storing = filesystemRecipePhotoStoreAdapter.store(
        photoId,
        randomBytes(16),
      );

      // assert
      await expect(storing).rejects.toThrow(
        "A recipe photo is already stored under this id.",
      );
      expect(await readFile(join(root, "photos", photoId))).toEqual(PHOTO);
    });
  });

  describe("opening", () => {
    it("opens the whole stored photo with its size", async () => {
      // arrange
      const photoId = await storedPhoto();

      // act
      const opening = await filesystemRecipePhotoStoreAdapter.open(photoId);

      // assert
      expect(opening).toMatchObject({
        status: "opened",
        sizeBytes: PHOTO.byteLength,
      });
      if (opening.status === "opened") {
        expect(await readAll(opening.bytes)).toEqual(PHOTO);
      }
      expect(everyOpenedFileIsClosed()).toBe(true);
    });

    it("answers missing for a photo that is not stored", async () => {
      // arrange
      await storedPhoto();

      // act
      const opening =
        await filesystemRecipePhotoStoreAdapter.open(randomUUID());

      // assert
      expect(opening).toEqual({ status: "missing" });
    });

    it("answers missing before any photo was stored", async () => {
      // arrange
      const photoId = randomUUID();

      // act
      const opening = await filesystemRecipePhotoStoreAdapter.open(photoId);

      // assert
      expect(opening).toEqual({ status: "missing" });
    });

    it("opens the photo's file only once its bytes are first pulled", async () => {
      // arrange
      const photoId = await storedPhoto();
      openedFiles.length = 0;

      // act
      const opening = await filesystemRecipePhotoStoreAdapter.open(photoId);
      const openedBeforePulling = openedFiles.length;
      const chunks =
        opening.status === "opened"
          ? opening.bytes[Symbol.asyncIterator]()
          : null;
      const firstChunk = await chunks?.next();
      await chunks?.return?.();

      // assert
      expect(openedBeforePulling).toBe(0);
      expect(firstChunk).toMatchObject({ done: false });
      expect(openedFiles).toHaveLength(1);
      expect(everyOpenedFileIsClosed()).toBe(true);
    });
  });

  describe("removing", () => {
    it("removes a stored photo and leaves the other photos alone", async () => {
      // arrange
      const photoId = await storedPhoto();
      const otherId = await storedPhoto();

      // act
      await filesystemRecipePhotoStoreAdapter.remove(photoId);

      // assert
      expect(await readdir(join(root, "photos"))).toEqual([otherId]);
      expect(await filesystemRecipePhotoStoreAdapter.open(photoId)).toEqual({
        status: "missing",
      });
    });

    it("removes what is not there without failing", async () => {
      // arrange
      const photoId = await storedPhoto();
      await filesystemRecipePhotoStoreAdapter.remove(photoId);

      // act
      const outcomes = await Promise.allSettled([
        filesystemRecipePhotoStoreAdapter.remove(photoId),
        new FilesystemRecipePhotoStoreAdapter(join(workspace, "empty")).remove(
          randomUUID(),
        ),
      ]);

      // assert
      expect(outcomes.map((outcome) => outcome.status)).toEqual([
        "fulfilled",
        "fulfilled",
      ]);
    });
  });

  it.each(HOSTILE_IDS)(
    "refuses the id %j before touching the disk",
    async (id) => {
      // arrange
      const calls = [
        () => filesystemRecipePhotoStoreAdapter.store(id, PHOTO),
        () => filesystemRecipePhotoStoreAdapter.open(id),
        () => filesystemRecipePhotoStoreAdapter.remove(id),
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

  describe("with the photos folder linked outside the storage root", () => {
    let outside: string;

    beforeEach(async () => {
      outside = join(workspace, "outside");
      await mkdir(outside);
      await writeFile(join(outside, "photo-1"), PHOTO);
      await symlink(outside, join(root, "photos"));
    });

    it("refuses to store a photo through it", async () => {
      // arrange
      const photoId = randomUUID();

      // act
      const storing = filesystemRecipePhotoStoreAdapter.store(photoId, PHOTO);

      // assert
      await expect(storing).rejects.toThrow(LOCATION_LEAVES_ROOT);
      expect(await readdir(outside)).toEqual(["photo-1"]);
    });

    it("refuses to open a photo through it", async () => {
      // arrange
      const photoId = "photo-1";

      // act
      const opening = filesystemRecipePhotoStoreAdapter.open(photoId);

      // assert
      await expect(opening).rejects.toThrow(LOCATION_LEAVES_ROOT);
      expect(everyOpenedFileIsClosed()).toBe(true);
    });

    it("refuses to remove a photo through it and leaves the linked file", async () => {
      // arrange
      const photoId = "photo-1";

      // act
      const removing = filesystemRecipePhotoStoreAdapter.remove(photoId);

      // assert
      await expect(removing).rejects.toThrow(LOCATION_LEAVES_ROOT);
      expect(await readdir(outside)).toEqual(["photo-1"]);
    });
  });

  it("refuses to open a photo file linked from outside the storage root", async () => {
    // arrange
    const outsideFile = join(workspace, "outside-photo");
    await writeFile(outsideFile, PHOTO);
    await mkdir(join(root, "photos"));
    await symlink(outsideFile, join(root, "photos", "photo-1"));

    // act
    const opening = filesystemRecipePhotoStoreAdapter.open("photo-1");

    // assert
    await expect(opening).rejects.toThrow(LOCATION_LEAVES_ROOT);
  });
});
