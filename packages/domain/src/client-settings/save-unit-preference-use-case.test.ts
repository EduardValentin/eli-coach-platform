import { describe, expect, it, vi } from "vitest";

import type { ClientReach, ClientReachReading } from "../client";

import { ClientSettings } from "./client-settings";
import type { ClientSettingsChanges } from "./client-settings-changes";
import type { ClientSettingsSource } from "./client-settings-source";
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
    clients: {
      findByAuthSubjectId: vi.fn().mockResolvedValue(input.reach),
    } satisfies Pick<ClientReach, "findByAuthSubjectId">,
    settings: {
      findByClientId: vi.fn().mockResolvedValue(input.stored),
    } satisfies ClientSettingsSource,
    changes: {
      saveUnits: vi.fn().mockResolvedValue(undefined),
    } satisfies ClientSettingsChanges,
  };
  const useCase = new SaveUnitPreferenceUseCase({
    ...ports,
    clock: { now: () => NOW },
  });

  return { ports, useCase };
}

describe("SaveUnitPreferenceUseCase", () => {
  it("saves her units now on her settings, keeping her preferences", async () => {
    // arrange
    const { ports, useCase } = createUseCase({
      reach: reachOf("reachable"),
      stored: SEEDED_SETTINGS,
    });

    // act
    const result = await useCase.execute({
      authSubjectId: "user_ana",
      preference: IMPERIAL,
    });

    // assert
    expect(result).toEqual({ status: "saved" });
    expect(ports.clients.findByAuthSubjectId).toHaveBeenCalledWith("user_ana");
    expect(ports.settings.findByClientId).toHaveBeenCalledWith("client-1");
    const [saved] = ports.changes.saveUnits.mock.calls[0] ?? [];
    expect(saved?.toSnapshot()).toEqual({
      ...SEEDED_SETTINGS.toSnapshot(),
      unitPreference: IMPERIAL,
      updatedAt: NOW,
    });
  });

  it("saves nothing for a client with no stored settings", async () => {
    // arrange
    const { ports, useCase } = createUseCase({
      reach: reachOf("reachable"),
      stored: null,
    });

    // act
    const result = await useCase.execute({
      authSubjectId: "user_ana",
      preference: IMPERIAL,
    });

    // assert
    expect(result).toEqual({ status: "not-on-journey" });
    expect(ports.changes.saveUnits).not.toHaveBeenCalled();
  });

  it("saves nothing for a subject bound to no client", async () => {
    // arrange
    const { ports, useCase } = createUseCase({ reach: null, stored: null });

    // act
    const result = await useCase.execute({
      authSubjectId: "user_stranger",
      preference: IMPERIAL,
    });

    // assert
    expect(result).toEqual({ status: "not-on-journey" });
    expect(ports.changes.saveUnits).not.toHaveBeenCalled();
  });

  it("saves nothing for a client whose portal access has ended", async () => {
    // arrange
    const { ports, useCase } = createUseCase({
      reach: reachOf("ended"),
      stored: SEEDED_SETTINGS,
    });

    // act
    const result = await useCase.execute({
      authSubjectId: "user_ana",
      preference: IMPERIAL,
    });

    // assert
    expect(result).toEqual({ status: "ended" });
    expect(ports.changes.saveUnits).not.toHaveBeenCalled();
  });

  it("saves the units of a client still awaiting her onboarding", async () => {
    // arrange
    const { useCase } = createUseCase({
      reach: reachOf("awaiting_onboarding"),
      stored: SEEDED_SETTINGS,
    });

    // act
    const result = await useCase.execute({
      authSubjectId: "user_ana",
      preference: IMPERIAL,
    });

    // assert
    expect(result).toEqual({ status: "saved" });
  });
});
