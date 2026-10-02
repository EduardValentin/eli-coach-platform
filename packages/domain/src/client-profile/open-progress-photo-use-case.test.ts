import { describe, expect, it, vi } from "vitest";

import type { MeasurementClients } from "./measurement-clients";
import type { MeasurementIncidents } from "./measurement-incidents";
import { ProgressPhoto } from "./progress-photo";
import type { ProgressPhotoStore } from "./progress-photo-store";
import type { ProgressPhotos } from "./progress-photos";
import { OpenProgressPhotoUseCase } from "./open-progress-photo-use-case";

const PHOTO_BYTES = new Uint8Array([7, 7, 7]);
const REFERENCE = { storageKey: "client-1/entry-1/photo-1.bin", keyId: "k1" };
const PHOTO = ProgressPhoto.reconstitute({
  id: "photo-1",
  entryId: "entry-1",
  clientId: "client-1",
  view: "front",
  reference: REFERENCE,
  mimeType: "image/jpeg",
  sizeBytes: 3,
  createdAt: new Date("2026-10-01T08:00:00.000Z"),
});

function createPorts(
  stored: {
    photo?: ProgressPhoto | null;
    requesterClient?: { clientId: string } | null;
    bytes?: Uint8Array | null;
  } = {},
) {
  return {
    clients: {
      findByAuthSubjectId: vi
        .fn()
        .mockResolvedValue(
          stored.requesterClient === undefined
            ? { clientId: "client-1" }
            : stored.requesterClient,
        ),
    } satisfies MeasurementClients,
    photos: {
      add: vi.fn(),
      findById: vi
        .fn()
        .mockResolvedValue(stored.photo === undefined ? PHOTO : stored.photo),
      delete: vi.fn(),
    } satisfies ProgressPhotos,
    store: {
      store: vi.fn(),
      open: vi
        .fn()
        .mockResolvedValue(
          stored.bytes === undefined ? PHOTO_BYTES : stored.bytes,
        ),
      delete: vi.fn(),
    } satisfies ProgressPhotoStore,
    incidents: {
      measurementEntrySaved: vi.fn(),
      progressPhotoStored: vi.fn(),
      progressPhotoRefused: vi.fn(),
      progressPhotoDeleted: vi.fn(),
      progressPhotoAccessRefused: vi.fn(),
    } satisfies MeasurementIncidents,
  };
}

describe("OpenProgressPhotoUseCase", () => {
  it("opens her own photo for the client it belongs to", async () => {
    // arrange
    const ports = createPorts();
    const useCase = new OpenProgressPhotoUseCase(ports);

    // act
    const result = await useCase.execute({
      photoId: "photo-1",
      requester: { role: "CLIENT", authSubjectId: "user_ana" },
    });

    // assert
    expect(result).toEqual({
      status: "opened",
      bytes: PHOTO_BYTES,
      mimeType: "image/jpeg",
    });
    expect(ports.clients.findByAuthSubjectId).toHaveBeenCalledWith("user_ana");
    expect(ports.store.open).toHaveBeenCalledWith(REFERENCE);
  });

  it("opens any client's photo for the coach", async () => {
    // arrange
    const ports = createPorts({ requesterClient: null });
    const useCase = new OpenProgressPhotoUseCase(ports);

    // act
    const result = await useCase.execute({
      photoId: "photo-1",
      requester: { role: "COACH", authSubjectId: "user_eli" },
    });

    // assert
    expect(result).toEqual({
      status: "opened",
      bytes: PHOTO_BYTES,
      mimeType: "image/jpeg",
    });
  });

  it.each([
    ["another client", { clientId: "client-2" }],
    ["an account bound to no client", null],
  ])(
    "finds nothing for %s and reports the refused access",
    async (_case, requesterClient) => {
      // arrange
      const ports = createPorts({ requesterClient });
      const useCase = new OpenProgressPhotoUseCase(ports);

      // act
      const result = await useCase.execute({
        photoId: "photo-1",
        requester: { role: "CLIENT", authSubjectId: "user_other" },
      });

      // assert
      expect(result).toEqual({ status: "not-found" });
      expect(ports.store.open).not.toHaveBeenCalled();
      expect(ports.incidents.progressPhotoAccessRefused).toHaveBeenCalledWith({
        requesterRole: "CLIENT",
        photoId: "photo-1",
      });
    },
  );

  it("finds nothing for a photo that does not exist, without reporting it", async () => {
    // arrange
    const ports = createPorts({ photo: null });
    const useCase = new OpenProgressPhotoUseCase(ports);

    // act
    const result = await useCase.execute({
      photoId: "photo-missing",
      requester: { role: "COACH", authSubjectId: "user_eli" },
    });

    // assert
    expect(result).toEqual({ status: "not-found" });
    expect(ports.incidents.progressPhotoAccessRefused).not.toHaveBeenCalled();
  });

  it("finds nothing when the stored file is gone", async () => {
    // arrange
    const ports = createPorts({ bytes: null });
    const useCase = new OpenProgressPhotoUseCase(ports);

    // act
    const result = await useCase.execute({
      photoId: "photo-1",
      requester: { role: "CLIENT", authSubjectId: "user_ana" },
    });

    // assert
    expect(result).toEqual({ status: "not-found" });
  });
});
