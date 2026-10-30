import { describe, expect, it, vi } from "vitest";

import type { ClientReachPort } from "../client-reach-port";

import type { MeasurementIncidentsPort } from "./measurement-incidents-port";
import { ProgressPhoto } from "./progress-photo";
import type { ProgressPhotoReference } from "./progress-photo-reference";
import type {
  ProgressPhotoOwner,
  ProgressPhotoStorePort,
} from "./progress-photo-store-port";
import type { ProgressPhotosPort } from "./progress-photos-port";
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

class InMemoryProgressPhotosAdapter implements ProgressPhotosPort {
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

class InMemoryProgressPhotoStoreAdapter implements ProgressPhotoStorePort {
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
    clientReachPort: {
      findByAuthSubjectId: vi.fn().mockResolvedValue(requesterClient),
    } satisfies Pick<ClientReachPort, "findByAuthSubjectId">,
    progressPhotosPort: new InMemoryProgressPhotosAdapter(),
    progressPhotoStorePort: new InMemoryProgressPhotoStoreAdapter(),
    measurementIncidentsPort: {
      measurementEntrySaved: vi.fn(),
      progressPhotoStored: vi.fn(),
      progressPhotoRefused: vi.fn(),
      progressPhotoDeleted: vi.fn(),
      progressPhotoAccessRefused: vi.fn(),
    } satisfies MeasurementIncidentsPort,
  };
}

describe("RemoveProgressPhotoUseCase", () => {
  it("deletes her photo's record and its file", async () => {
    // arrange
    const ports = createPorts({ clientId: "client-1" });
    const removeProgressPhotoUseCase = new RemoveProgressPhotoUseCase(ports);

    // act
    const result = await removeProgressPhotoUseCase.execute({
      photoId: "photo-1",
      requester: { role: "CLIENT", authSubjectId: "user_ana" },
    });

    // assert
    expect(result).toEqual({ status: "removed" });
    expect(ports.clientReachPort.findByAuthSubjectId).toHaveBeenCalledWith(
      "user_ana",
    );
    expect(ports.progressPhotosPort.rows.size).toBe(0);
    expect(ports.progressPhotoStorePort.files.size).toBe(0);
    expect(
      ports.measurementIncidentsPort.progressPhotoDeleted,
    ).toHaveBeenCalledWith({
      clientId: "client-1",
      entryId: "entry-1",
      photoId: "photo-1",
      view: "side",
    });
  });

  it("deletes the record before the file", async () => {
    // arrange
    const ports = createPorts({ clientId: "client-1" });
    const deleteRecord = vi.spyOn(ports.progressPhotosPort, "delete");
    const deleteFile = vi.spyOn(ports.progressPhotoStorePort, "delete");
    const removeProgressPhotoUseCase = new RemoveProgressPhotoUseCase(ports);

    // act
    await removeProgressPhotoUseCase.execute({
      photoId: "photo-1",
      requester: { role: "CLIENT", authSubjectId: "user_ana" },
    });

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
    vi.spyOn(ports.progressPhotosPort, "delete").mockRejectedValueOnce(
      new Error("connection lost"),
    );
    const removeProgressPhotoUseCase = new RemoveProgressPhotoUseCase(ports);

    // act
    const removal = removeProgressPhotoUseCase.execute({
      photoId: "photo-1",
      requester: { role: "CLIENT", authSubjectId: "user_ana" },
    });

    // assert
    await expect(removal).rejects.toThrow("connection lost");
    expect(ports.progressPhotosPort.rows.size).toBe(1);
    expect(ports.progressPhotoStorePort.files.size).toBe(1);
  });

  it("leaves only an unreferenced file when deleting the file fails", async () => {
    // arrange
    const ports = createPorts({ clientId: "client-1" });
    vi.spyOn(ports.progressPhotoStorePort, "delete").mockRejectedValueOnce(
      new Error("disk unavailable"),
    );
    const removeProgressPhotoUseCase = new RemoveProgressPhotoUseCase(ports);

    // act
    const removal = removeProgressPhotoUseCase.execute({
      photoId: "photo-1",
      requester: { role: "CLIENT", authSubjectId: "user_ana" },
    });

    // assert
    await expect(removal).rejects.toThrow("disk unavailable");
    expect(ports.progressPhotosPort.rows.size).toBe(0);
    expect(ports.progressPhotoStorePort.files.size).toBe(1);
  });

  it.each([
    ["another client", { clientId: "client-2" }, "CLIENT" as const],
    ["the coach, who is bound to no client", null, "COACH" as const],
  ])(
    "deletes nothing for %s and records the refused access",
    async (_case, requesterClient, role) => {
      // arrange
      const ports = createPorts(requesterClient);
      const removeProgressPhotoUseCase = new RemoveProgressPhotoUseCase(ports);

      // act
      const result = await removeProgressPhotoUseCase.execute({
        photoId: "photo-1",
        requester: { role, authSubjectId: "user_other" },
      });

      // assert
      expect(result).toEqual({ status: "not-found" });
      expect(ports.progressPhotosPort.rows.size).toBe(1);
      expect(ports.progressPhotoStorePort.files.size).toBe(1);
      expect(
        ports.measurementIncidentsPort.progressPhotoAccessRefused,
      ).toHaveBeenCalledWith({
        requesterRole: role,
        photoId: "photo-1",
      });
    },
  );

  it("finds nothing to delete for a photo that does not exist", async () => {
    // arrange
    const ports = createPorts({ clientId: "client-1" });
    const removeProgressPhotoUseCase = new RemoveProgressPhotoUseCase(ports);

    // act
    const result = await removeProgressPhotoUseCase.execute({
      photoId: "photo-missing",
      requester: { role: "CLIENT", authSubjectId: "user_ana" },
    });

    // assert
    expect(result).toEqual({ status: "not-found" });
    expect(
      ports.measurementIncidentsPort.progressPhotoAccessRefused,
    ).not.toHaveBeenCalled();
  });
});
