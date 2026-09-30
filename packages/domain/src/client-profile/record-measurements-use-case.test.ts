import { describe, expect, it, vi } from "vitest";

import type { MeasurementEntry } from "../measurement";
import { ClientProfile } from "./client-profile";
import type { ClientProfiles } from "./client-profiles";
import type { ClientMeasurementRecords } from "./client-measurement-records";
import type { MeasurementClients } from "./measurement-clients";
import type { MeasurementIncidents } from "./measurement-incidents";
import { ProgressPhoto, type ProgressPhotoView } from "./progress-photo";
import type {
  ProgressPhotoRendition,
  ProgressPhotoRenditions,
} from "./progress-photo-renditions";
import type { ProgressPhotoReference } from "./progress-photo-reference";
import type {
  ProgressPhotoOwner,
  ProgressPhotoStore,
} from "./progress-photo-store";
import type {
  ProgressPhotoIdGenerator,
  ProgressPhotos,
} from "./progress-photos";
import { RecordMeasurementsUseCase } from "./record-measurements-use-case";

const NOW = new Date("2026-10-01T08:00:00.000Z");
const CONSENTED_AT = new Date("2026-09-20T08:00:00.000Z");
const VALUES = { weightKg: 67.5, waistCm: 71, hipsCm: 97 };
const RENDERED_BYTES = new Uint8Array([9, 9, 9]);

type ProfileConsent = "consented" | "not-consented" | "no-profile";

function profileWith(consent: ProfileConsent): ClientProfile | null {
  if (consent === "no-profile") return null;

  return ClientProfile.fromOnboarding({
    clientId: "client-1",
    facts: {
      heightCm: 168,
      activityLevel: null,
      primaryGoal: null,
      dietaryRestrictions: "None",
      clientNotes: null,
    },
    progressPhotosConsentedAt: consent === "consented" ? CONSENTED_AT : null,
    now: CONSENTED_AT,
  });
}

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

function createPorts(
  options: {
    consent?: ProfileConsent;
    client?: { clientId: string } | null;
    rendition?: ProgressPhotoRendition;
  } = {},
) {
  let photoNumber = 0;
  const entries: MeasurementEntry[] = [];

  return {
    clients: {
      findByAuthSubjectId: vi
        .fn()
        .mockResolvedValue(
          options.client === undefined
            ? { clientId: "client-1" }
            : options.client,
        ),
    } satisfies MeasurementClients,
    profiles: {
      findByClientId: vi
        .fn()
        .mockResolvedValue(profileWith(options.consent ?? "consented")),
      recordPhotoConsent: vi.fn().mockResolvedValue(undefined),
    } satisfies ClientProfiles,
    records: {
      entries,
      listByClientId: vi.fn().mockResolvedValue([]),
      record: vi.fn(async (_clientId: string, entry: MeasurementEntry) => {
        entries.push(entry);

        return "entry-1";
      }),
    } satisfies ClientMeasurementRecords & { entries: MeasurementEntry[] },
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
    clock: { now: () => NOW },
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

describe("RecordMeasurementsUseCase", () => {
  it("records a new entry dated now with the readings she gave", async () => {
    // arrange
    const ports = createPorts();
    const useCase = new RecordMeasurementsUseCase(ports);

    // act
    const result = await useCase.execute({
      authSubjectId: "user_ana",
      values: VALUES,
      consentGiven: false,
      photos: [],
    });

    // assert
    expect(result).toEqual({
      status: "recorded",
      entryId: "entry-1",
      photos: {},
    });
    expect(ports.clients.findByAuthSubjectId).toHaveBeenCalledWith("user_ana");
    expect(ports.records.record).toHaveBeenCalledWith("client-1", {
      recordedAt: NOW,
      weightKg: 67.5,
      waistCm: 71,
      hipsCm: 97,
    });
    expect(ports.incidents.measurementEntrySaved).toHaveBeenCalledWith({
      clientId: "client-1",
      entryId: "entry-1",
    });
  });

  it("records nothing for a subject bound to no client", async () => {
    // arrange
    const ports = createPorts({ client: null });
    const useCase = new RecordMeasurementsUseCase(ports);

    // act
    const result = await useCase.execute({
      authSubjectId: "user_stranger",
      values: VALUES,
      consentGiven: true,
      photos: [receivedPhoto("front")],
    });

    // assert
    expect(result).toEqual({ status: "not-on-journey" });
    expect(ports.records.record).not.toHaveBeenCalled();
    expect(ports.profiles.recordPhotoConsent).not.toHaveBeenCalled();
  });

  it.each([
    ["without a waist", { weightKg: 67.5 }],
    ["with a weight out of range", { weightKg: 500, waistCm: 71 }],
  ])("records nothing %s", async (_case, values) => {
    // arrange
    const ports = createPorts();
    const useCase = new RecordMeasurementsUseCase(ports);

    // act
    const result = await useCase.execute({
      authSubjectId: "user_ana",
      values,
      consentGiven: true,
      photos: [receivedPhoto("front")],
    });

    // assert
    expect(result).toEqual({ status: "invalid" });
    expect(ports.records.record).not.toHaveBeenCalled();
    expect(ports.profiles.recordPhotoConsent).not.toHaveBeenCalled();
  });

  it("stores each accepted photo's rendition against her entry", async () => {
    // arrange
    const ports = createPorts();
    const useCase = new RecordMeasurementsUseCase(ports);

    // act
    const result = await useCase.execute({
      authSubjectId: "user_ana",
      values: VALUES,
      consentGiven: false,
      photos: [receivedPhoto("front"), receivedPhoto("back")],
    });

    // assert
    expect(result).toEqual({
      status: "recorded",
      entryId: "entry-1",
      photos: { front: "stored", back: "stored" },
    });
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
        createdAt: NOW,
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
        createdAt: NOW,
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
    expect(ports.records.record.mock.invocationCallOrder[0]).toBeLessThan(
      ports.renditions.render.mock.invocationCallOrder[0],
    );
  });

  it("records her consent from the sheet before it stores her first photos", async () => {
    // arrange
    const ports = createPorts({ consent: "not-consented" });
    const useCase = new RecordMeasurementsUseCase(ports);

    // act
    const result = await useCase.execute({
      authSubjectId: "user_ana",
      values: VALUES,
      consentGiven: true,
      photos: [receivedPhoto("side")],
    });

    // assert
    expect(ports.profiles.recordPhotoConsent).toHaveBeenCalledWith(
      "client-1",
      NOW,
    );
    expect(result).toEqual({
      status: "recorded",
      entryId: "entry-1",
      photos: { side: "stored" },
    });
  });

  it("keeps the date she first agreed when she has already consented", async () => {
    // arrange
    const ports = createPorts({ consent: "consented" });
    const useCase = new RecordMeasurementsUseCase(ports);

    // act
    await useCase.execute({
      authSubjectId: "user_ana",
      values: VALUES,
      consentGiven: true,
      photos: [],
    });

    // assert
    expect(ports.profiles.recordPhotoConsent).not.toHaveBeenCalled();
  });

  it.each([
    ["she has not consented", "not-consented"],
    ["she has no profile yet", "no-profile"],
  ] as const)(
    "refuses photos while %s, and keeps the entry",
    async (_case, consent) => {
      // arrange
      const ports = createPorts({ consent });
      const useCase = new RecordMeasurementsUseCase(ports);

      // act
      const result = await useCase.execute({
        authSubjectId: "user_ana",
        values: VALUES,
        consentGiven: false,
        photos: [receivedPhoto("front")],
      });

      // assert
      expect(result).toEqual({
        status: "recorded",
        entryId: "entry-1",
        photos: { front: "refused" },
      });
      expect(ports.renditions.render).not.toHaveBeenCalled();
      expect(ports.store.files.size).toBe(0);
      expect(ports.incidents.progressPhotoRefused).toHaveBeenCalledWith({
        clientId: "client-1",
        entryId: "entry-1",
        view: "front",
        receivedBytes: 2_000,
        reason: "consent-missing",
      });
    },
  );

  it.each([
    ["a HEIC photo", { mimeType: "image/heic" }],
    ["a photo over 10 MiB", { sizeBytes: 10 * 1024 * 1024 + 1 }],
  ])("refuses %s without rendering it", async (_case, overrides) => {
    // arrange
    const ports = createPorts();
    const useCase = new RecordMeasurementsUseCase(ports);

    // act
    const result = await useCase.execute({
      authSubjectId: "user_ana",
      values: VALUES,
      consentGiven: false,
      photos: [receivedPhoto("front", overrides), receivedPhoto("side")],
    });

    // assert
    expect(result).toEqual({
      status: "recorded",
      entryId: "entry-1",
      photos: { front: "refused", side: "stored" },
    });
    expect(ports.renditions.render).toHaveBeenCalledTimes(1);
    expect(ports.incidents.progressPhotoRefused).toHaveBeenCalledWith(
      expect.objectContaining({ view: "front", reason: "not-accepted" }),
    );
  });

  it("refuses a photo the renditions cannot process, and keeps the entry", async () => {
    // arrange
    const ports = createPorts({ rendition: { status: "refused" } });
    const useCase = new RecordMeasurementsUseCase(ports);

    // act
    const result = await useCase.execute({
      authSubjectId: "user_ana",
      values: VALUES,
      consentGiven: false,
      photos: [receivedPhoto("back")],
    });

    // assert
    expect(result).toEqual({
      status: "recorded",
      entryId: "entry-1",
      photos: { back: "refused" },
    });
    expect(ports.store.files.size).toBe(0);
    expect(ports.incidents.progressPhotoRefused).toHaveBeenCalledWith(
      expect.objectContaining({ view: "back", reason: "rendition-refused" }),
    );
  });

  it("answers refused rather than throwing when rendering throws", async () => {
    // arrange
    const ports = createPorts();
    ports.renditions.render.mockRejectedValueOnce(new Error("decoder crashed"));
    const useCase = new RecordMeasurementsUseCase(ports);

    // act
    const result = await useCase.execute({
      authSubjectId: "user_ana",
      values: VALUES,
      consentGiven: false,
      photos: [receivedPhoto("front")],
    });

    // assert
    expect(result).toEqual({
      status: "recorded",
      entryId: "entry-1",
      photos: { front: "refused" },
    });
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
    const useCase = new RecordMeasurementsUseCase(ports);

    // act
    const result = await useCase.execute({
      authSubjectId: "user_ana",
      values: VALUES,
      consentGiven: false,
      photos: [receivedPhoto("front"), receivedPhoto("side")],
    });

    // assert
    expect(result).toEqual({
      status: "recorded",
      entryId: "entry-1",
      photos: { front: "refused", side: "stored" },
    });
    expect(ports.photos.rows.size).toBe(1);
    expect(ports.incidents.progressPhotoRefused).toHaveBeenCalledWith(
      expect.objectContaining({ view: "front", reason: "storage-failed" }),
    );
  });

  it("answers refused when the photo record fails after its file is stored, leaving no record without a file", async () => {
    // arrange
    const ports = createPorts();
    vi.spyOn(ports.photos, "add").mockRejectedValueOnce(
      new Error("connection lost"),
    );
    const useCase = new RecordMeasurementsUseCase(ports);

    // act
    const result = await useCase.execute({
      authSubjectId: "user_ana",
      values: VALUES,
      consentGiven: false,
      photos: [receivedPhoto("front")],
    });

    // assert
    expect(result).toEqual({
      status: "recorded",
      entryId: "entry-1",
      photos: { front: "refused" },
    });
    expect(ports.photos.rows.size).toBe(0);
    expect(ports.records.entries).toHaveLength(1);
    expect(ports.incidents.progressPhotoRefused).toHaveBeenCalledWith(
      expect.objectContaining({ view: "front", reason: "storage-failed" }),
    );
  });
});
