import { describe, expect, it, vi } from "vitest";

import { AttachProgressPhotosUseCase } from "./attach-progress-photos-use-case";
import { ClientProfile } from "./client-profile";
import type { ClientProfilesPort } from "./client-profiles-port";
import type { MeasurementIncidentsPort } from "./measurement-incidents-port";
import type { ProgressPhoto, ProgressPhotoView } from "./progress-photo";
import type { ProgressPhotoRenditionsPort } from "./progress-photo-renditions-port";
import type { ProgressPhotoStorePort } from "./progress-photo-store-port";
import type { ProgressPhotosPort } from "./progress-photos-port";

const NOW = new Date("2026-10-01T08:00:00.000Z");
const CONSENTED_AT = new Date("2026-09-30T08:00:00.000Z");

type ProfileConsent = "consented" | "not-consented" | "no-profile";

function profileWith(consent: ProfileConsent): ClientProfile | null {
  if (consent === "no-profile") return null;

  return ClientProfile.reconstitute({
    clientId: "client-1",
    coaching: null,
    coachNotes: null,
    coachingSeededAt: null,
    progressPhotosConsentedAt: consent === "consented" ? CONSENTED_AT : null,
    createdAt: CONSENTED_AT,
    updatedAt: CONSENTED_AT,
  });
}

function createPorts(consent: ProfileConsent = "consented") {
  const added: ProgressPhoto[] = [];
  let photoNumber = 0;

  return {
    added,
    clientProfilesPort: {
      findByClientId: vi.fn().mockResolvedValue(profileWith(consent)),
      recordPhotoConsent: vi.fn().mockResolvedValue(undefined),
    } satisfies Pick<
      ClientProfilesPort,
      "findByClientId" | "recordPhotoConsent"
    >,
    progressPhotosPort: {
      add: vi.fn(async (photo: ProgressPhoto) => {
        added.push(photo);
      }),
      findById: vi.fn().mockResolvedValue(null),
      delete: vi.fn().mockResolvedValue(undefined),
    } satisfies ProgressPhotosPort,
    progressPhotoIdsPort: { generate: () => `photo-${++photoNumber}` },
    progressPhotoStorePort: {
      store: vi.fn().mockResolvedValue({ storageKey: "key", keyId: "memory" }),
      open: vi.fn().mockResolvedValue(null),
      delete: vi.fn().mockResolvedValue(undefined),
    } satisfies ProgressPhotoStorePort,
    progressPhotoRenditionsPort: {
      render: vi.fn().mockResolvedValue({
        status: "rendered",
        bytes: new Uint8Array([9, 9, 9]),
        mimeType: "image/jpeg",
      }),
    } satisfies ProgressPhotoRenditionsPort,
    clockPort: { now: () => NOW },
    measurementIncidentsPort: {
      measurementEntrySaved: vi.fn(),
      progressPhotoStored: vi.fn(),
      progressPhotoRefused: vi.fn(),
      progressPhotoDeleted: vi.fn(),
      progressPhotoAccessRefused: vi.fn(),
    } satisfies MeasurementIncidentsPort,
  };
}

function receivedPhoto(view: ProgressPhotoView) {
  return {
    view,
    mimeType: "image/jpeg",
    sizeBytes: 2_000,
    bytes: new Uint8Array([1, 2, 3]),
  };
}

const THREE_PHOTOS = [
  receivedPhoto("front"),
  receivedPhoto("side"),
  receivedPhoto("back"),
];

describe("AttachProgressPhotosUseCase", () => {
  it("stores her photos against the entry, dated now, once she has agreed to share them", async () => {
    // arrange
    const ports = createPorts("consented");
    const attachProgressPhotosUseCase = new AttachProgressPhotosUseCase(ports);

    // act
    const outcomes = await attachProgressPhotosUseCase.execute({
      clientId: "client-1",
      entryId: "entry-1",
      photos: THREE_PHOTOS,
    });

    // assert
    expect(outcomes).toEqual({
      front: "stored",
      side: "stored",
      back: "stored",
    });
    expect(ports.clientProfilesPort.findByClientId).toHaveBeenCalledWith(
      "client-1",
    );
    expect(ports.added.map((photo) => photo.toSnapshot())).toEqual(
      ["front", "side", "back"].map((view) =>
        expect.objectContaining({
          entryId: "entry-1",
          clientId: "client-1",
          view,
          createdAt: NOW,
        }),
      ),
    );
  });

  it.each([
    ["she has not agreed to share them", "not-consented"],
    ["she has no profile", "no-profile"],
  ] as const)(
    "refuses every photo while %s, without rendering any",
    async (_case, consent) => {
      // arrange
      const ports = createPorts(consent);
      const attachProgressPhotosUseCase = new AttachProgressPhotosUseCase(
        ports,
      );

      // act
      const outcomes = await attachProgressPhotosUseCase.execute({
        clientId: "client-1",
        entryId: "entry-1",
        photos: THREE_PHOTOS,
      });

      // assert
      expect(outcomes).toEqual({
        front: "refused",
        side: "refused",
        back: "refused",
      });
      expect(ports.progressPhotoRenditionsPort.render).not.toHaveBeenCalled();
      expect(ports.added).toEqual([]);
      expect(
        ports.measurementIncidentsPort.progressPhotoRefused,
      ).toHaveBeenCalledTimes(3);
      expect(
        ports.measurementIncidentsPort.progressPhotoRefused,
      ).toHaveBeenCalledWith({
        clientId: "client-1",
        entryId: "entry-1",
        view: "front",
        receivedBytes: 2_000,
        reason: "consent-missing",
      });
    },
  );

  it("refuses every photo it was handed, without throwing, when her profile cannot be read", async () => {
    // arrange
    const ports = createPorts("consented");
    ports.clientProfilesPort.findByClientId.mockRejectedValueOnce(
      new Error("connection lost"),
    );
    const attachProgressPhotosUseCase = new AttachProgressPhotosUseCase(ports);

    // act
    const outcomes = await attachProgressPhotosUseCase.execute({
      clientId: "client-1",
      entryId: "entry-1",
      photos: [receivedPhoto("front"), receivedPhoto("back")],
    });

    // assert
    expect(outcomes).toEqual({ front: "refused", back: "refused" });
    expect(ports.progressPhotoRenditionsPort.render).not.toHaveBeenCalled();
    expect(
      ports.measurementIncidentsPort.progressPhotoRefused,
    ).toHaveBeenCalledTimes(2);
    expect(
      ports.measurementIncidentsPort.progressPhotoRefused,
    ).toHaveBeenCalledWith({
      clientId: "client-1",
      entryId: "entry-1",
      view: "back",
      receivedBytes: 2_000,
      reason: "storage-failed",
    });
  });
});
