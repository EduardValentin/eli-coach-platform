import { describe, expect, it, vi } from "vitest";

import type { ClientReachPort, ClientReachReading } from "../client-reach-port";

import { ClientSettings } from "./client-settings";
import type { ClientSettingsChangesPort } from "./client-settings-changes-port";
import type { ClientSettingsSourcePort } from "./client-settings-source-port";
import { SaveUnitPreferenceUseCase } from "./save-unit-preference-use-case";
import type { UnitPreferenceSnapshot } from "./unit-preference";

const OPENED_AT = new Date("2026-09-27T08:00:00.000Z");
const NOW = new Date("2026-09-28T10:00:00.000Z");
const IMPERIAL: UnitPreferenceSnapshot = {
  weightUnit: "lb",
  heightUnit: "ft-in",
};

const SEEDED_SETTINGS = ClientSettings.reconstitute({
  clientId: "client-1",
  unitPreference: { weightUnit: "kg", heightUnit: "cm" },
  preferredCheckInWeekday: "monday",
  preferredChannel: "email",
  updatedAt: OPENED_AT,
});

function reachOf(portal: ClientReachReading["portal"]): ClientReachReading {
  return {
    clientId: "client-1",
    portal,
    coachingEndsAt: null,
    programStartsAt: null,
    paidThrough: null,
    timeZone: "Europe/Bucharest",
  };
}

function createUseCase(input: {
  reach: ClientReachReading | null;
  stored: ClientSettings | null;
}) {
  const ports = {
    clientReachPort: {
      findByAuthSubjectId: vi.fn().mockResolvedValue(input.reach),
    } satisfies Pick<ClientReachPort, "findByAuthSubjectId">,
    clientSettingsSourcePort: {
      findByClientId: vi.fn().mockResolvedValue(input.stored),
    } satisfies ClientSettingsSourcePort,
    clientSettingsChangesPort: {
      saveUnits: vi.fn().mockResolvedValue(undefined),
    } satisfies ClientSettingsChangesPort,
  };
  const saveUnitPreferenceUseCase = new SaveUnitPreferenceUseCase({
    ...ports,
    clockPort: { now: () => NOW },
  });

  return { ports, saveUnitPreferenceUseCase };
}

describe("SaveUnitPreferenceUseCase", () => {
  it("saves her units now on her settings, keeping her preferences", async () => {
    // arrange
    const { ports, saveUnitPreferenceUseCase } = createUseCase({
      reach: reachOf("reachable"),
      stored: SEEDED_SETTINGS,
    });

    // act
    const result = await saveUnitPreferenceUseCase.execute({
      authSubjectId: "user_ana",
      preference: IMPERIAL,
    });

    // assert
    expect(result).toEqual({ status: "saved" });
    expect(ports.clientReachPort.findByAuthSubjectId).toHaveBeenCalledWith(
      "user_ana",
    );
    expect(ports.clientSettingsSourcePort.findByClientId).toHaveBeenCalledWith(
      "client-1",
    );
    const [saved] =
      ports.clientSettingsChangesPort.saveUnits.mock.calls[0] ?? [];
    expect(saved?.toSnapshot()).toEqual({
      ...SEEDED_SETTINGS.toSnapshot(),
      unitPreference: IMPERIAL,
      updatedAt: NOW,
    });
  });

  it("saves nothing for a client with no stored settings", async () => {
    // arrange
    const { ports, saveUnitPreferenceUseCase } = createUseCase({
      reach: reachOf("reachable"),
      stored: null,
    });

    // act
    const result = await saveUnitPreferenceUseCase.execute({
      authSubjectId: "user_ana",
      preference: IMPERIAL,
    });

    // assert
    expect(result).toEqual({ status: "not-on-journey" });
    expect(ports.clientSettingsChangesPort.saveUnits).not.toHaveBeenCalled();
  });

  it("saves nothing for a subject bound to no client", async () => {
    // arrange
    const { ports, saveUnitPreferenceUseCase } = createUseCase({
      reach: null,
      stored: null,
    });

    // act
    const result = await saveUnitPreferenceUseCase.execute({
      authSubjectId: "user_stranger",
      preference: IMPERIAL,
    });

    // assert
    expect(result).toEqual({ status: "not-on-journey" });
    expect(ports.clientSettingsChangesPort.saveUnits).not.toHaveBeenCalled();
  });

  it("saves nothing for a client whose portal access has ended", async () => {
    // arrange
    const { ports, saveUnitPreferenceUseCase } = createUseCase({
      reach: reachOf("ended"),
      stored: SEEDED_SETTINGS,
    });

    // act
    const result = await saveUnitPreferenceUseCase.execute({
      authSubjectId: "user_ana",
      preference: IMPERIAL,
    });

    // assert
    expect(result).toEqual({ status: "ended" });
    expect(ports.clientSettingsChangesPort.saveUnits).not.toHaveBeenCalled();
  });

  it("saves the units of a client still awaiting her onboarding", async () => {
    // arrange
    const { saveUnitPreferenceUseCase } = createUseCase({
      reach: reachOf("awaiting_onboarding"),
      stored: SEEDED_SETTINGS,
    });

    // act
    const result = await saveUnitPreferenceUseCase.execute({
      authSubjectId: "user_ana",
      preference: IMPERIAL,
    });

    // assert
    expect(result).toEqual({ status: "saved" });
  });
});
