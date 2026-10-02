import { describe, expect, it } from "vitest";

import {
  MAX_PROGRESS_PHOTO_BYTES,
  ProgressPhoto,
  type ProgressPhotoSnapshot,
} from "./progress-photo";

const STORED_AT = new Date("2026-10-01T09:00:00.000Z");
const REFERENCE = { storageKey: "client-1/entry-1/photo-1.bin", keyId: "k1" };

describe("ProgressPhoto.accepts", () => {
  it.each(["image/jpeg", "image/png", "image/webp"])(
    "accepts a %s photo",
    (mimeType) => {
      // arrange
      const photo = { mimeType, sizeBytes: 2_000_000 };

      // act
      const accepted = ProgressPhoto.accepts(photo);

      // assert
      expect(accepted).toBe(true);
    },
  );

  it.each(["image/heic", "image/gif", "application/pdf", ""])(
    "refuses a photo of type %j",
    (mimeType) => {
      // arrange
      const photo = { mimeType, sizeBytes: 2_000_000 };

      // act
      const accepted = ProgressPhoto.accepts(photo);

      // assert
      expect(accepted).toBe(false);
    },
  );

  it("accepts a photo of exactly 10 MiB", () => {
    // arrange
    const photo = {
      mimeType: "image/jpeg",
      sizeBytes: MAX_PROGRESS_PHOTO_BYTES,
    };

    // act
    const accepted = ProgressPhoto.accepts(photo);

    // assert
    expect(MAX_PROGRESS_PHOTO_BYTES).toBe(10 * 1024 * 1024);
    expect(accepted).toBe(true);
  });

  it("refuses a photo over 10 MiB", () => {
    // arrange
    const photo = {
      mimeType: "image/jpeg",
      sizeBytes: MAX_PROGRESS_PHOTO_BYTES + 1,
    };

    // act
    const accepted = ProgressPhoto.accepts(photo);

    // assert
    expect(accepted).toBe(false);
  });
});

describe("ProgressPhoto.stored", () => {
  it("records the stored rendition's type and size for her entry's view", () => {
    // arrange
    const rendition = {
      bytes: new Uint8Array([1, 2, 3, 4]),
      mimeType: "image/jpeg" as const,
    };

    // act
    const photo = ProgressPhoto.stored({
      id: "photo-1",
      entryId: "entry-1",
      clientId: "client-1",
      view: "side",
      reference: REFERENCE,
      rendition,
      at: STORED_AT,
    });

    // assert
    expect(photo.toSnapshot()).toEqual({
      id: "photo-1",
      entryId: "entry-1",
      clientId: "client-1",
      view: "side",
      reference: REFERENCE,
      mimeType: "image/jpeg",
      sizeBytes: 4,
      createdAt: STORED_AT,
    });
  });
});

describe("ProgressPhoto#isOwnedBy", () => {
  const snapshot: ProgressPhotoSnapshot = {
    id: "photo-1",
    entryId: "entry-1",
    clientId: "client-1",
    view: "front",
    reference: REFERENCE,
    mimeType: "image/jpeg",
    sizeBytes: 120_000,
    createdAt: STORED_AT,
  };

  it("holds for the client whose entry it belongs to", () => {
    // arrange
    const photo = ProgressPhoto.reconstitute(snapshot);

    // act
    const owned = photo.isOwnedBy("client-1");

    // assert
    expect(owned).toBe(true);
  });

  it("does not hold for another client", () => {
    // arrange
    const photo = ProgressPhoto.reconstitute(snapshot);

    // act
    const owned = photo.isOwnedBy("client-2");

    // assert
    expect(owned).toBe(false);
  });

  it("gives back the snapshot it was rebuilt from", () => {
    // arrange, act
    const photo = ProgressPhoto.reconstitute(snapshot);

    // assert
    expect(photo.toSnapshot()).toEqual(snapshot);
  });
});
