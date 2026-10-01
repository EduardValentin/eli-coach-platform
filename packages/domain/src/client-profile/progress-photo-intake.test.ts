import { describe, expect, it, vi } from "vitest";

import type { MeasurementIncidents } from "./measurement-incidents";
import { ProgressPhoto, type ProgressPhotoView } from "./progress-photo";
import {
  ProgressPhotoIntake,
  type EntryReceivingPhotos,
} from "./progress-photo-intake";
import type { ProgressPhotoReference } from "./progress-photo-reference";
import type {
  ProgressPhotoRendition,
  ProgressPhotoRenditions,
} from "./progress-photo-renditions";
import type {
  ProgressPhotoOwner,
  ProgressPhotoStore,
} from "./progress-photo-store";
import type {
  ProgressPhotoIdGenerator,
  ProgressPhotos,
} from "./progress-photos";

const RECEIVED_AT = new Date("2026-10-01T08:00:00.000Z");
const RENDERED_BYTES = new Uint8Array([9, 9, 9]);

const CONSENTED_ENTRY: EntryReceivingPhotos = {
  clientId: "client-1",
  entryId: "entry-1",
  receivedAt: RECEIVED_AT,
  photosConsented: true,
};

class InMemoryProgressPhotoStore implements ProgressPhotoStore {
  readonly files = new Map<string, Uint8Array>();

  async store(
    owner: ProgressPhotoOwner,
    bytes: Uint8Array,
  ): Promise<ProgressPhotoReference> {
    const storageKey = `${owner.clientId}/${owner.entryId}/${owner.photoId}.bin`;
    this.files.set(storageKey, bytes);

    return { storageKey, keyId: "memory" };
  }

  async open(reference: ProgressPhotoReference): Promise<Uint8Array | null> {
    return this.files.get(reference.storageKey) ?? null;
  }

  async delete(reference: ProgressPhotoReference): Promise<void> {
    this.files.delete(reference.storageKey);
  }
}

class InMemoryProgressPhotos implements ProgressPhotos {
  readonly rows = new Map<string, ProgressPhoto>();

  async add(photo: ProgressPhoto): Promise<void> {
    this.rows.set(photo.toSnapshot().id, photo);
  }

  async findById(photoId: string): Promise<ProgressPhoto | null> {
    return this.rows.get(photoId) ?? null;
  }

  async delete(photoId: string): Promise<void> {
    this.rows.delete(photoId);
  }
}

function createPorts(options: { rendition?: ProgressPhotoRendition } = {}) {
  let photoNumber = 0;

  return {
    photos: new InMemoryProgressPhotos(),
    photoIds: {
      generate: () => `photo-${++photoNumber}`,
    } satisfies ProgressPhotoIdGenerator,
    store: new InMemoryProgressPhotoStore(),
    renditions: {
      render: vi.fn().mockResolvedValue(
        options.rendition ?? {
          status: "rendered",
          bytes: RENDERED_BYTES,
          mimeType: "image/jpeg",
        },
      ),
    } satisfies ProgressPhotoRenditions,
    incidents: {
      measurementEntrySaved: vi.fn(),
      progressPhotoStored: vi.fn(),
      progressPhotoRefused: vi.fn(),
      progressPhotoDeleted: vi.fn(),
      progressPhotoAccessRefused: vi.fn(),
    } satisfies MeasurementIncidents,
  };
}

function receivedPhoto(
  view: ProgressPhotoView,
  overrides: { mimeType?: string; sizeBytes?: number } = {},
) {
  return {
    view,
    mimeType: overrides.mimeType ?? "image/jpeg",
    sizeBytes: overrides.sizeBytes ?? 2_000,
    bytes: new Uint8Array([1, 2, 3]),
  };
}

describe("ProgressPhotoIntake", () => {
  it("stores each accepted photo's rendition against the entry, dated when it was received", async () => {
    // arrange
    const ports = createPorts();
    const intake = new ProgressPhotoIntake(ports);

    // act
    const outcomes = await intake.attachTo(CONSENTED_ENTRY, [
      receivedPhoto("front"),
      receivedPhoto("back"),
    ]);

    // assert
    expect(outcomes).toEqual({ front: "stored", back: "stored" });
    expect(
      [...ports.photos.rows.values()].map((photo) => photo.toSnapshot()),
    ).toEqual([
      {
        id: "photo-1",
        entryId: "entry-1",
        clientId: "client-1",
        view: "front",
        reference: {
          storageKey: "client-1/entry-1/photo-1.bin",
          keyId: "memory",
        },
        mimeType: "image/jpeg",
        sizeBytes: 3,
        createdAt: RECEIVED_AT,
      },
      {
        id: "photo-2",
        entryId: "entry-1",
        clientId: "client-1",
        view: "back",
        reference: {
          storageKey: "client-1/entry-1/photo-2.bin",
          keyId: "memory",
        },
        mimeType: "image/jpeg",
        sizeBytes: 3,
        createdAt: RECEIVED_AT,
      },
    ]);
    expect(ports.store.files.get("client-1/entry-1/photo-1.bin")).toBe(
      RENDERED_BYTES,
    );
    expect(ports.incidents.progressPhotoStored).toHaveBeenCalledWith({
      clientId: "client-1",
      entryId: "entry-1",
      view: "front",
      receivedBytes: 2_000,
      storedBytes: 3,
    });
  });

  it("answers nothing when no photo was received", async () => {
    // arrange
    const ports = createPorts();
    const intake = new ProgressPhotoIntake(ports);

    // act
    const outcomes = await intake.attachTo(CONSENTED_ENTRY, []);

    // assert
    expect(outcomes).toEqual({});
    expect(ports.renditions.render).not.toHaveBeenCalled();
  });

  it.each([
    ["a HEIC photo", { mimeType: "image/heic" }],
    ["a photo over 10 MiB", { sizeBytes: 10 * 1024 * 1024 + 1 }],
  ])("refuses %s without rendering it", async (_case, overrides) => {
    // arrange
    const ports = createPorts();
    const intake = new ProgressPhotoIntake(ports);

    // act
    const outcomes = await intake.attachTo(CONSENTED_ENTRY, [
      receivedPhoto("front", overrides),
      receivedPhoto("side"),
    ]);

    // assert
    expect(outcomes).toEqual({ front: "refused", side: "stored" });
    expect(ports.renditions.render).toHaveBeenCalledTimes(1);
    expect(ports.incidents.progressPhotoRefused).toHaveBeenCalledWith(
      expect.objectContaining({ view: "front", reason: "not-accepted" }),
    );
  });

  it("refuses every photo while she has not agreed to share them", async () => {
    // arrange
    const ports = createPorts();
    const intake = new ProgressPhotoIntake(ports);

    // act
    const outcomes = await intake.attachTo(
      { ...CONSENTED_ENTRY, photosConsented: false },
      [receivedPhoto("front"), receivedPhoto("side")],
    );

    // assert
    expect(outcomes).toEqual({ front: "refused", side: "refused" });
    expect(ports.renditions.render).not.toHaveBeenCalled();
    expect(ports.store.files.size).toBe(0);
    expect(ports.incidents.progressPhotoRefused).toHaveBeenCalledWith({
      clientId: "client-1",
      entryId: "entry-1",
      view: "side",
      receivedBytes: 2_000,
      reason: "consent-missing",
    });
  });

  it("refuses a photo the renditions cannot process", async () => {
    // arrange
    const ports = createPorts({ rendition: { status: "refused" } });
    const intake = new ProgressPhotoIntake(ports);

    // act
    const outcomes = await intake.attachTo(CONSENTED_ENTRY, [
      receivedPhoto("back"),
    ]);

    // assert
    expect(outcomes).toEqual({ back: "refused" });
    expect(ports.store.files.size).toBe(0);
    expect(ports.incidents.progressPhotoRefused).toHaveBeenCalledWith(
      expect.objectContaining({ view: "back", reason: "rendition-refused" }),
    );
  });

  it("answers refused rather than throwing when rendering throws", async () => {
    // arrange
    const ports = createPorts();
    ports.renditions.render.mockRejectedValueOnce(new Error("decoder crashed"));
    const intake = new ProgressPhotoIntake(ports);

    // act
    const outcomes = await intake.attachTo(CONSENTED_ENTRY, [
      receivedPhoto("front"),
      receivedPhoto("side"),
    ]);

    // assert
    expect(outcomes).toEqual({ front: "refused", side: "stored" });
    expect(ports.incidents.progressPhotoRefused).toHaveBeenCalledWith(
      expect.objectContaining({ view: "front", reason: "rendition-refused" }),
    );
  });

  it("answers refused and goes on with the next photo when the store throws", async () => {
    // arrange
    const ports = createPorts();
    vi.spyOn(ports.store, "store").mockRejectedValueOnce(
      new Error("disk full"),
    );
    const intake = new ProgressPhotoIntake(ports);

    // act
    const outcomes = await intake.attachTo(CONSENTED_ENTRY, [
      receivedPhoto("front"),
      receivedPhoto("side"),
    ]);

    // assert
    expect(outcomes).toEqual({ front: "refused", side: "stored" });
    expect(ports.photos.rows.size).toBe(1);
    expect(ports.incidents.progressPhotoRefused).toHaveBeenCalledWith(
      expect.objectContaining({ view: "front", reason: "storage-failed" }),
    );
  });

  it("answers refused when the photo record fails after its file is stored", async () => {
    // arrange
    const ports = createPorts();
    vi.spyOn(ports.photos, "add").mockRejectedValueOnce(
      new Error("connection lost"),
    );
    const intake = new ProgressPhotoIntake(ports);

    // act
    const outcomes = await intake.attachTo(CONSENTED_ENTRY, [
      receivedPhoto("front"),
    ]);

    // assert
    expect(outcomes).toEqual({ front: "refused" });
    expect(ports.photos.rows.size).toBe(0);
    expect(ports.incidents.progressPhotoRefused).toHaveBeenCalledWith(
      expect.objectContaining({ view: "front", reason: "storage-failed" }),
    );
  });

  it("never throws when every port behind the photos fails", async () => {
    // arrange
    const ports = createPorts();
    ports.renditions.render
      .mockResolvedValueOnce({
        status: "rendered",
        bytes: RENDERED_BYTES,
        mimeType: "image/jpeg",
      })
      .mockRejectedValueOnce(new Error("decoder crashed"));
    vi.spyOn(ports.photoIds, "generate").mockImplementation(() => {
      throw new Error("no randomness");
    });
    vi.spyOn(ports.store, "store").mockRejectedValue(new Error("disk full"));
    vi.spyOn(ports.photos, "add").mockRejectedValue(new Error("offline"));
    const intake = new ProgressPhotoIntake(ports);

    // act
    const outcomes = await intake.attachTo(CONSENTED_ENTRY, [
      receivedPhoto("front"),
      receivedPhoto("side"),
      receivedPhoto("back", { mimeType: "text/plain" }),
    ]);

    // assert
    expect(outcomes).toEqual({
      front: "refused",
      side: "refused",
      back: "refused",
    });
    expect(ports.incidents.progressPhotoStored).not.toHaveBeenCalled();
    expect(ports.incidents.progressPhotoRefused).toHaveBeenCalledTimes(3);
  });
});
