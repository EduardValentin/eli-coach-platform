import { describe, expect, it, vi } from "vitest";

import { UnitPreference } from "../unit-preference";
import { ClientProfile } from "./client-profile";
import type { ClientProfiles } from "./client-profiles";
import type { ClientMeasurementRecords } from "./client-measurement-records";
import type { ClientUnitPreferencesSource } from "../unit-preference";
import type { MeasurementClients } from "./measurement-clients";
import {
  MeasurementHistory,
  type MeasurementRecord,
} from "./measurement-history";
import { ReadOwnMeasurementHistoryUseCase } from "./read-own-measurement-history-use-case";

const CONSENTED_AT = new Date("2026-09-20T08:00:00.000Z");
const WEIGH_IN_DUE_AT = new Date("2026-10-05T08:00:00.000Z");
const IMPERIAL = UnitPreference.of("imperial");
const FIRST: MeasurementRecord = {
  id: "entry-1",
  recordedAt: new Date("2026-09-20T08:00:00.000Z"),
  weightKg: 68,
  waistCm: 72,
  photos: [],
};
const LATEST: MeasurementRecord = {
  id: "entry-2",
  recordedAt: new Date("2026-09-27T08:00:00.000Z"),
  weightKg: 67.4,
  waistCm: 71,
  photos: [],
};

function createPorts(stored: {
  client: { clientId: string } | null;
  consentedAt: Date | null;
  unitPreference?: UnitPreference | null;
}) {
  return {
    clock: { now: () => WEIGH_IN_DUE_AT },
    clients: {
      findByAuthSubjectId: vi.fn().mockResolvedValue(stored.client),
    } satisfies MeasurementClients,
    profiles: {
      findByClientId: vi.fn().mockResolvedValue(
        ClientProfile.fromOnboarding({
          clientId: "client-1",
          facts: {
            heightCm: 168,
            activityLevel: null,
            primaryGoal: null,
            dietaryRestrictions: "None",
            clientNotes: null,
          },
          progressPhotosConsentedAt: stored.consentedAt,
          now: CONSENTED_AT,
        }),
      ),
      recordPhotoConsent: vi.fn(),
    } satisfies ClientProfiles,
    records: {
      listByClientId: vi.fn().mockResolvedValue([FIRST, LATEST]),
      record: vi.fn(),
    } satisfies ClientMeasurementRecords,
    unitPreferences: {
      findByClientId: vi
        .fn()
        .mockResolvedValue(
          stored.unitPreference === undefined
            ? IMPERIAL
            : stored.unitPreference,
        ),
    } satisfies ClientUnitPreferencesSource,
  };
}

describe("ReadOwnMeasurementHistoryUseCase", () => {
  it("reads her history newest first with the date she agreed to share photos, what is due now and her units", async () => {
    // arrange
    const ports = createPorts({
      client: { clientId: "client-1" },
      consentedAt: CONSENTED_AT,
    });
    const useCase = new ReadOwnMeasurementHistoryUseCase(ports);

    // act
    const reading = await useCase.execute({ authSubjectId: "user_ana" });

    // assert
    expect(reading).toEqual({
      history: MeasurementHistory.of([LATEST, FIRST]),
      consentedAt: CONSENTED_AT,
      dueLine: "weigh-in",
      units: IMPERIAL,
    });
    expect(reading?.history.newestFirst()).toEqual([LATEST, FIRST]);
    expect(ports.clients.findByAuthSubjectId).toHaveBeenCalledWith("user_ana");
    expect(ports.records.listByClientId).toHaveBeenCalledWith("client-1");
    expect(ports.profiles.findByClientId).toHaveBeenCalledWith("client-1");
    expect(ports.unitPreferences.findByClientId).toHaveBeenCalledWith(
      "client-1",
    );
  });

  it("reads her units as metric while she has never chosen any", async () => {
    // arrange
    const ports = createPorts({
      client: { clientId: "client-1" },
      consentedAt: null,
      unitPreference: null,
    });
    const useCase = new ReadOwnMeasurementHistoryUseCase(ports);

    // act
    const reading = await useCase.execute({ authSubjectId: "user_ana" });

    // assert
    expect(reading?.units).toEqual(UnitPreference.metric());
  });

  it("reads no consent date while she has not agreed", async () => {
    // arrange
    const ports = createPorts({
      client: { clientId: "client-1" },
      consentedAt: null,
    });
    const useCase = new ReadOwnMeasurementHistoryUseCase(ports);

    // act
    const reading = await useCase.execute({ authSubjectId: "user_ana" });

    // assert
    expect(reading?.consentedAt).toBeNull();
  });

  it("reads nothing for a subject bound to no client", async () => {
    // arrange
    const ports = createPorts({ client: null, consentedAt: null });
    const useCase = new ReadOwnMeasurementHistoryUseCase(ports);

    // act
    const reading = await useCase.execute({ authSubjectId: "user_stranger" });

    // assert
    expect(reading).toBeNull();
    expect(ports.records.listByClientId).not.toHaveBeenCalled();
    expect(ports.unitPreferences.findByClientId).not.toHaveBeenCalled();
  });
});
