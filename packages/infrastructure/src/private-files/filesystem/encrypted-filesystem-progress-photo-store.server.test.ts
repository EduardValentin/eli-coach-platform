import { randomBytes } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { EncryptedFilesystemProgressPhotoStore } from "./encrypted-filesystem-progress-photo-store.server";

const KEY_ID = "unit-1";
const OWNER = { clientId: "client-1", entryId: "entry-1", photoId: "photo-1" };
const PHOTO = new TextEncoder().encode("rendered progress photo bytes");
const IV_BYTES = 12;
const TAG_BYTES = 16;
const REFERENCES_LEAVING_THE_ROOT = [
  "../outside.bin",
  "client-1/../../outside.bin",
  "/etc/passwd",
  "",
];

describe("EncryptedFilesystemProgressPhotoStore", () => {
  let workspace: string;
  let root: string;
  let store: EncryptedFilesystemProgressPhotoStore;

  beforeEach(async () => {
    workspace = await mkdtemp(join(tmpdir(), "progress-photo-store-"));
    root = join(workspace, "media");
    await mkdir(root);
    store = new EncryptedFilesystemProgressPhotoStore({
      root,
      key: randomBytes(32),
      keyId: KEY_ID,
    });
  });

  afterEach(async () => {
    await rm(workspace, { recursive: true, force: true });
  });

  it("opens the bytes it stored under the owner's layout and the configured key id", async () => {
    // arrange
    // act
    const reference = await store.store(OWNER, PHOTO);
    const opened = await store.open(reference);

    // assert
    expect(reference).toEqual({
      storageKey: "client-1/entry-1/photo-1.bin",
      keyId: KEY_ID,
    });
    expect(opened).toEqual(PHOTO);
  });

  it("writes the photo encrypted, never as its plaintext", async () => {
    // arrange
    // act
    const reference = await store.store(OWNER, PHOTO);

    // assert
    const written = await readFile(join(root, reference.storageKey));
    expect(written).toHaveLength(IV_BYTES + PHOTO.length + TAG_BYTES);
    expect(written.includes(Buffer.from(PHOTO))).toBe(false);
  });

  it("refuses a photo whose ciphertext was tampered with", async () => {
    // arrange
    const reference = await store.store(OWNER, PHOTO);
    const path = join(root, reference.storageKey);
    const written = await readFile(path);
    written[IV_BYTES] ^= 0xff;
    await writeFile(path, written);

    // act
    const opening = store.open(reference);

    // assert
    await expect(opening).rejects.toThrow(
      "Progress photo failed its integrity check.",
    );
  });

  it("refuses a photo moved under another owner's storage key", async () => {
    // arrange
    const reference = await store.store(OWNER, PHOTO);
    const otherOwnerKey = "client-2/entry-2/photo-2.bin";
    await mkdir(join(root, "client-2/entry-2"), { recursive: true });
    await writeFile(
      join(root, otherOwnerKey),
      await readFile(join(root, reference.storageKey)),
    );

    // act
    const opening = store.open({ storageKey: otherOwnerKey, keyId: KEY_ID });

    // assert
    await expect(opening).rejects.toThrow(
      "Progress photo failed its integrity check.",
    );
  });

  it("refuses a reference stored under a key id it is not configured with", async () => {
    // arrange
    const reference = await store.store(OWNER, PHOTO);

    // act
    const opening = store.open({ ...reference, keyId: "retired-0" });

    // assert
    await expect(opening).rejects.toThrow(
      "Progress photo key id retired-0 is not configured.",
    );
  });

  it("opens nothing for a reference with no file behind it", async () => {
    // arrange
    // act
    const opened = await store.open({
      storageKey: "client-1/entry-1/missing.bin",
      keyId: KEY_ID,
    });

    // assert
    expect(opened).toBeNull();
  });

  it.each(REFERENCES_LEAVING_THE_ROOT)(
    "refuses to open the reference %j that leaves the media root",
    async (key) => {
      // arrange
      const reference = { storageKey: key, keyId: KEY_ID };

      // act
      const opening = store.open(reference);

      // assert
      await expect(opening).rejects.toThrow(
        "Invalid progress photo reference.",
      );
    },
  );

  it.each(REFERENCES_LEAVING_THE_ROOT)(
    "refuses to delete the reference %j that leaves the media root",
    async (key) => {
      // arrange
      const reference = { storageKey: key, keyId: KEY_ID };

      // act
      const deleting = store.delete(reference);

      // assert
      await expect(deleting).rejects.toThrow(
        "Invalid progress photo reference.",
      );
    },
  );

  it.each([
    { clientId: "..", entryId: "entry-1", photoId: "photo-1" },
    { clientId: "client-1", entryId: "a/b", photoId: "photo-1" },
    { clientId: "client-1", entryId: "entry-1", photoId: "" },
  ])("refuses to store for the owner %j", async (owner) => {
    // arrange
    // act
    const storing = store.store(owner, PHOTO);

    // assert
    await expect(storing).rejects.toThrow("Invalid progress photo owner.");
  });

  it("refuses to open a file linked from outside the media root", async () => {
    // arrange
    const outside = join(workspace, "outside.bin");
    await writeFile(outside, PHOTO);
    await mkdir(join(root, "client-1/entry-1"), { recursive: true });
    await symlink(outside, join(root, "client-1/entry-1/photo-1.bin"));

    // act
    const opening = store.open({
      storageKey: "client-1/entry-1/photo-1.bin",
      keyId: KEY_ID,
    });

    // assert
    await expect(opening).rejects.toThrow("Invalid progress photo reference.");
  });

  it("refuses to store through a client folder linked outside the media root", async () => {
    // arrange
    const outside = join(workspace, "outside");
    await mkdir(outside);
    await symlink(outside, join(root, "client-1"));

    // act
    const storing = store.store(OWNER, PHOTO);

    // assert
    await expect(storing).rejects.toThrow(
      "Progress photo location leaves the media root.",
    );
    await expect(readdir(outside)).resolves.toEqual([]);
  });

  it("refuses to delete through a client folder linked outside the media root", async () => {
    // arrange
    const outside = join(workspace, "outside");
    await mkdir(join(outside, "entry-1"), { recursive: true });
    await writeFile(join(outside, "entry-1/photo-1.bin"), PHOTO);
    await symlink(outside, join(root, "client-1"));

    // act
    const deleting = store.delete({
      storageKey: "client-1/entry-1/photo-1.bin",
      keyId: KEY_ID,
    });

    // assert
    await expect(deleting).rejects.toThrow("Invalid progress photo reference.");
    expect(await readFile(join(outside, "entry-1/photo-1.bin"))).toEqual(
      Buffer.from(PHOTO),
    );
  });

  it("refuses to overwrite a photo already stored for the owner", async () => {
    // arrange
    const reference = await store.store(OWNER, PHOTO);

    // act
    const storing = store.store(OWNER, new Uint8Array([9]));

    // assert
    await expect(storing).rejects.toThrow(
      "A progress photo is already stored for this owner.",
    );
    expect(await store.open(reference)).toEqual(PHOTO);
  });

  it("deletes a stored photo and deletes again without failing", async () => {
    // arrange
    const reference = await store.store(OWNER, PHOTO);

    // act
    await store.delete(reference);
    await store.delete(reference);

    // assert
    expect(await store.open(reference)).toBeNull();
  });
});
