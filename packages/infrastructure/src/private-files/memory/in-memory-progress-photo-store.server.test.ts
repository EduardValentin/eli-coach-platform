import { describe, expect, it } from "vitest";

import { InMemoryProgressPhotoStore } from "./in-memory-progress-photo-store.server";

const OWNER = { clientId: "client-1", entryId: "entry-1", photoId: "photo-1" };
const PHOTO = new Uint8Array([1, 2, 3, 4]);

describe("InMemoryProgressPhotoStore", () => {
  it("opens the bytes it stored under a reference derived from the owner", async () => {
    // arrange
    const store = new InMemoryProgressPhotoStore();

    // act
    const reference = await store.store(OWNER, PHOTO);
    const opened = await store.open(reference);

    // assert
    expect(reference).toEqual({
      storageKey: "client-1/entry-1/photo-1.bin",
      keyId: "memory",
    });
    expect(opened).toEqual(PHOTO);
  });

  it("opens nothing for a reference it never stored", async () => {
    // arrange
    const store = new InMemoryProgressPhotoStore();

    // act
    const opened = await store.open({
      storageKey: "client-1/entry-1/unknown.bin",
      keyId: "memory",
    });

    // assert
    expect(opened).toBeNull();
  });

  it("refuses to store a second photo for the same owner", async () => {
    // arrange
    const store = new InMemoryProgressPhotoStore();
    const reference = await store.store(OWNER, PHOTO);

    // act
    const storeAgain = store.store(OWNER, new Uint8Array([9]));

    // assert
    await expect(storeAgain).rejects.toThrow(
      "A progress photo is already stored for this owner.",
    );
    expect(await store.open(reference)).toEqual(PHOTO);
  });

  it("deletes a stored photo and deletes again without failing", async () => {
    // arrange
    const store = new InMemoryProgressPhotoStore();
    const reference = await store.store(OWNER, PHOTO);

    // act
    await store.delete(reference);
    await store.delete(reference);

    // assert
    expect(await store.open(reference)).toBeNull();
  });
});
