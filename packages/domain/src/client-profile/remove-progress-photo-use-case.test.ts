import { describe, expect, it, vi } from "vitest";

import type { MeasurementClients } from "./measurement-clients";
import type { MeasurementIncidents } from "./measurement-incidents";
import { ProgressPhoto } from "./progress-photo";
import type { ProgressPhotoReference } from "./progress-photo-reference";
import type {
  ProgressPhotoOwner,
  ProgressPhotoStore,
} from "./progress-photo-store";
import type { ProgressPhotos } from "./progress-photos";
import { RemoveProgressPhotoUseCase } from "./remove-progress-photo-use-case";

const REFERENCE = { storageKey: "client-1/entry-1/photo-1.bin", keyId: "k1" };
const PHOTO = ProgressPhoto.reconstitute({
  id: "photo-1",
  entryId: "entry-1",
  clientId: "client-1",
  view: "side",
  reference: REFERENCE,
  mimeType: "image/jpeg",
  sizeBytes: 3,
  createdAt: new Date("2026-10-01T08:00:00.000Z"),
});

class InMemoryProgressPhotos implements ProgressPhotos {
  readonly rows = new Map([[PHOTO.toSnapshot().id, PHOTO]]);

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

class InMemoryProgressPhotoStore implements ProgressPhotoStore {
  readonly files = new Map<string, Uint8Array>([
    [REFERENCE.storageKey, new Uint8Array([7])],
  ]);

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

function createPorts(requesterClient: { clientId: string } | null) {
  return {
    clients: {
      findByAuthSubjectId: vi.fn().mockResolvedValue(requesterClient),
    } satisfies MeasurementClients,
    photos: new InMemoryProgressPhotos(),
    store: new InMemoryProgressPhotoStore(),
    incidents: {
      measurementEntrySaved: vi.fn(),
      progressPhotoStored: vi.fn(),
      progressPhotoRefused: vi.fn(),
      progressPhotoDeleted: vi.fn(),
      progressPhotoAccessRefused: vi.fn(),
    } satisfies MeasurementIncidents,
  };
}

describe("RemoveProgressPhotoUseCase", () => {
  it("deletes her photo's record and its file", async () => {
    // arrange
    const ports = createPorts({ clientId: "client-1" });
    const useCase = new RemoveProgressPhotoUseCase(ports);

    // act
    const result = await useCase.execute({
      photoId: "photo-1",
      authSubjectId: "user_ana",
    });

    // assert
    expect(result).toEqual({ status: "removed" });
    expect(ports.clients.findByAuthSubjectId).toHaveBeenCalledWith("user_ana");
    expect(ports.photos.rows.size).toBe(0);
    expect(ports.store.files.size).toBe(0);
    expect(ports.incidents.progressPhotoDeleted).toHaveBeenCalledWith({
      clientId: "client-1",
      entryId: "entry-1",
      photoId: "photo-1",
      view: "side",
    });
  });

  it("deletes the record before the file", async () => {
    // arrange
    const ports = createPorts({ clientId: "client-1" });
    const deleteRecord = vi.spyOn(ports.photos, "delete");
    const deleteFile = vi.spyOn(ports.store, "delete");
    const useCase = new RemoveProgressPhotoUseCase(ports);

    // act
    await useCase.execute({ photoId: "photo-1", authSubjectId: "user_ana" });

    // assert
    expect(deleteRecord).toHaveBeenCalledWith("photo-1");
    expect(deleteFile).toHaveBeenCalledWith(REFERENCE);
    expect(deleteRecord.mock.invocationCallOrder[0]).toBeLessThan(
      deleteFile.mock.invocationCallOrder[0],
    );
  });

  it("leaves both the record and the file when deleting the record fails", async () => {
    // arrange
    const ports = createPorts({ clientId: "client-1" });
    vi.spyOn(ports.photos, "delete").mockRejectedValueOnce(
      new Error("connection lost"),
    );
    const useCase = new RemoveProgressPhotoUseCase(ports);

    // act
    const removal = useCase.execute({
      photoId: "photo-1",
      authSubjectId: "user_ana",
    });

    // assert
    await expect(removal).rejects.toThrow("connection lost");
    expect(ports.photos.rows.size).toBe(1);
    expect(ports.store.files.size).toBe(1);
  });

  it("leaves only an unreferenced file when deleting the file fails", async () => {
    // arrange
    const ports = createPorts({ clientId: "client-1" });
    vi.spyOn(ports.store, "delete").mockRejectedValueOnce(
      new Error("disk unavailable"),
    );
    const useCase = new RemoveProgressPhotoUseCase(ports);

    // act
    const removal = useCase.execute({
      photoId: "photo-1",
      authSubjectId: "user_ana",
    });

    // assert
    await expect(removal).rejects.toThrow("disk unavailable");
    expect(ports.photos.rows.size).toBe(0);
    expect(ports.store.files.size).toBe(1);
  });

  it.each([
    ["another client", { clientId: "client-2" }],
    ["an account bound to no client, such as the coach", null],
  ])("deletes nothing for %s", async (_case, requesterClient) => {
    // arrange
    const ports = createPorts(requesterClient);
    const useCase = new RemoveProgressPhotoUseCase(ports);

    // act
    const result = await useCase.execute({
      photoId: "photo-1",
      authSubjectId: "user_other",
    });

    // assert
    expect(result).toEqual({ status: "not-found" });
    expect(ports.photos.rows.size).toBe(1);
    expect(ports.store.files.size).toBe(1);
  });

  it("finds nothing to delete for a photo that does not exist", async () => {
    // arrange
    const ports = createPorts({ clientId: "client-1" });
    const useCase = new RemoveProgressPhotoUseCase(ports);

    // act
    const result = await useCase.execute({
      photoId: "photo-missing",
      authSubjectId: "user_ana",
    });

    // assert
    expect(result).toEqual({ status: "not-found" });
  });
});
