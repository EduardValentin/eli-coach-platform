import { describe, expect, it, vi } from "vitest";

import type { ClientReachPort } from "../client-reach-port";

import {
  ClientSettings,
  UnitPreference,
  type ClientSettingsSourcePort,
} from "../client-settings";
import { ClientProfile } from "./client-profile";
import type { ClientProfilesPort } from "./client-profiles-port";
import type { ClientMeasurementRecordsPort } from "./client-measurement-records-port";
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

function settingsWith(
  preference: UnitPreference | null,
): ClientSettings | null {
  return (
    preference &&
    ClientSettings.reconstitute({
      clientId: "client-1",
      unitPreference: preference.toSnapshot(),
      preferredCheckInWeekday: null,
      preferredChannel: null,
      updatedAt: CONSENTED_AT,
    })
  );
}

function createPorts(stored: {
  client: { clientId: string } | null;
  consentedAt: Date | null;
  unitPreference?: UnitPreference | null;
}) {
  return {
    clockPort: { now: () => WEIGH_IN_DUE_AT },
    clientReachPort: {
      findByAuthSubjectId: vi.fn().mockResolvedValue(stored.client),
    } satisfies Pick<ClientReachPort, "findByAuthSubjectId">,
    clientProfilesPort: {
      findByClientId: vi.fn().mockResolvedValue(
        ClientProfile.reconstitute({
          clientId: "client-1",
          coaching: null,
          coachNotes: null,
          coachingSeededAt: null,
          progressPhotosConsentedAt: stored.consentedAt,
          createdAt: CONSENTED_AT,
          updatedAt: CONSENTED_AT,
        }),
      ),
    } satisfies Pick<ClientProfilesPort, "findByClientId">,
    clientMeasurementRecordsPort: {
      listByClientId: vi.fn().mockResolvedValue([FIRST, LATEST]),
      record: vi.fn(),
    } satisfies ClientMeasurementRecordsPort,
    clientSettingsSourcePort: {
      findByClientId: vi
        .fn()
        .mockResolvedValue(
          settingsWith(
            stored.unitPreference === undefined
              ? IMPERIAL
              : stored.unitPreference,
          ),
        ),
    } satisfies ClientSettingsSourcePort,
  };
}

describe("ReadOwnMeasurementHistoryUseCase", () => {
  it("reads her history newest first with the date she agreed to share photos, what is due now and her units", async () => {
    // arrange
    const ports = createPorts({
      client: { clientId: "client-1" },
      consentedAt: CONSENTED_AT,
    });
    const readOwnMeasurementHistoryUseCase =
      new ReadOwnMeasurementHistoryUseCase(ports);

    // act
    const reading = await readOwnMeasurementHistoryUseCase.execute({
      authSubjectId: "user_ana",
    });

    // assert
    expect(reading).toEqual({
      history: MeasurementHistory.of([LATEST, FIRST]),
      consentedAt: CONSENTED_AT,
      dueLine: "weigh-in",
      units: IMPERIAL,
    });
    expect(reading?.history.newestFirst()).toEqual([LATEST, FIRST]);
    expect(ports.clientReachPort.findByAuthSubjectId).toHaveBeenCalledWith(
      "user_ana",
    );
    expect(
      ports.clientMeasurementRecordsPort.listByClientId,
    ).toHaveBeenCalledWith("client-1");
    expect(ports.clientProfilesPort.findByClientId).toHaveBeenCalledWith(
      "client-1",
    );
    expect(ports.clientSettingsSourcePort.findByClientId).toHaveBeenCalledWith(
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
    const readOwnMeasurementHistoryUseCase =
      new ReadOwnMeasurementHistoryUseCase(ports);

    // act
    const reading = await readOwnMeasurementHistoryUseCase.execute({
      authSubjectId: "user_ana",
    });

    // assert
    expect(reading?.units).toEqual(UnitPreference.metric());
  });

  it("reads no consent date while she has not agreed", async () => {
    // arrange
    const ports = createPorts({
      client: { clientId: "client-1" },
      consentedAt: null,
    });
    const readOwnMeasurementHistoryUseCase =
      new ReadOwnMeasurementHistoryUseCase(ports);

    // act
    const reading = await readOwnMeasurementHistoryUseCase.execute({
      authSubjectId: "user_ana",
    });

    // assert
    expect(reading?.consentedAt).toBeNull();
  });

  it("reads nothing for a subject bound to no client", async () => {
    // arrange
    const ports = createPorts({ client: null, consentedAt: null });
    const readOwnMeasurementHistoryUseCase =
      new ReadOwnMeasurementHistoryUseCase(ports);

    // act
    const reading = await readOwnMeasurementHistoryUseCase.execute({
      authSubjectId: "user_stranger",
    });

    // assert
    expect(reading).toBeNull();
    expect(
      ports.clientMeasurementRecordsPort.listByClientId,
    ).not.toHaveBeenCalled();
    expect(
      ports.clientSettingsSourcePort.findByClientId,
    ).not.toHaveBeenCalled();
  });
});
