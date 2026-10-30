import { describe, expect, it } from "vitest";

import { progressPhotoStorageKey } from "./client-media-layout.server";
import { InMemoryClientMediaStoreAdapter } from "./in-memory-client-media-store-adapter.server";

const OWNER = { clientId: "client-1", entryId: "entry-1", photoId: "photo-1" };
const PHOTO = new Uint8Array([1, 2, 3, 4]);

describe("InMemoryClientMediaStore", () => {
  it("opens the bytes it stored under a reference derived from the owner", async () => {
    // arrange
    const inMemoryClientMediaStoreAdapter = new InMemoryClientMediaStoreAdapter(
      progressPhotoStorageKey,
    );

    // act
    const reference = await inMemoryClientMediaStoreAdapter.store(OWNER, PHOTO);
    const opened = await inMemoryClientMediaStoreAdapter.open(reference);

    // assert
    expect(reference).toEqual({
      storageKey: "client-1/entry-1/photo-1.bin",
      keyId: "memory",
    });
    expect(opened).toEqual(PHOTO);
  });

  it("opens nothing for a reference it never stored", async () => {
    // arrange
    const inMemoryClientMediaStoreAdapter = new InMemoryClientMediaStoreAdapter(
      progressPhotoStorageKey,
    );

    // act
    const opened = await inMemoryClientMediaStoreAdapter.open({
      storageKey: "client-1/entry-1/unknown.bin",
      keyId: "memory",
    });

    // assert
    expect(opened).toBeNull();
  });

  it("refuses to store a second photo for the same owner", async () => {
    // arrange
    const inMemoryClientMediaStoreAdapter = new InMemoryClientMediaStoreAdapter(
      progressPhotoStorageKey,
    );
    const reference = await inMemoryClientMediaStoreAdapter.store(OWNER, PHOTO);

    // act
    const storeAgain = inMemoryClientMediaStoreAdapter.store(
      OWNER,
      new Uint8Array([9]),
    );

    // assert
    await expect(storeAgain).rejects.toThrow(
      "A client media file is already stored under this key.",
    );
    expect(await inMemoryClientMediaStoreAdapter.open(reference)).toEqual(
      PHOTO,
    );
  });

  it("deletes a stored photo and deletes again without failing", async () => {
    // arrange
    const inMemoryClientMediaStoreAdapter = new InMemoryClientMediaStoreAdapter(
      progressPhotoStorageKey,
    );
    const reference = await inMemoryClientMediaStoreAdapter.store(OWNER, PHOTO);

    // act
    await inMemoryClientMediaStoreAdapter.delete(reference);
    await inMemoryClientMediaStoreAdapter.delete(reference);

    // assert
    expect(await inMemoryClientMediaStoreAdapter.open(reference)).toBeNull();
  });
});
