import { describe, expect, it, vi } from "vitest";

import type { ClientReach, ClientReachReading } from "../client";

import type { ClientUnitPreferences } from "./client-unit-preferences";
import { SaveUnitPreferenceUseCase } from "./save-unit-preference-use-case";
import { UnitPreference, type UnitPreferenceSnapshot } from "./unit-preference";

const NOW = new Date("2026-09-28T10:00:00.000Z");
const IMPERIAL: UnitPreferenceSnapshot = {
  weightUnit: "lb",
  heightUnit: "ft-in",
};

function reachOf(portal: ClientReachReading["portal"]): ClientReachReading {
  return {
    clientId: "client-1",
    portal,
    coachingEndsAt: null,
    timeZone: "Europe/Bucharest",
  };
}

function createClients(found: ClientReachReading | null) {
  return {
    findByAuthSubjectId: vi.fn().mockResolvedValue(found),
  } satisfies Pick<ClientReach, "findByAuthSubjectId">;
}

function createPreferences() {
  return {
    findByClientId: vi.fn().mockResolvedValue(null),
    save: vi.fn().mockResolvedValue(undefined),
  } satisfies ClientUnitPreferences;
}

describe("SaveUnitPreferenceUseCase", () => {
  it("saves her units now", async () => {
    // arrange
    const clients = createClients(reachOf("reachable"));
    const preferences = createPreferences();
    const useCase = new SaveUnitPreferenceUseCase({
      clients,
      preferences,
      clock: { now: () => NOW },
    });

    // act
    const result = await useCase.execute({
      authSubjectId: "user_ana",
      preference: IMPERIAL,
    });

    // assert
    expect(result).toEqual({ status: "saved" });
    expect(clients.findByAuthSubjectId).toHaveBeenCalledWith("user_ana");
    expect(preferences.save).toHaveBeenCalledWith({
      clientId: "client-1",
      preference: UnitPreference.from(IMPERIAL),
      at: NOW,
    });
  });

  it("saves nothing for a subject bound to no client", async () => {
    // arrange
    const preferences = createPreferences();
    const useCase = new SaveUnitPreferenceUseCase({
      clients: createClients(null),
      preferences,
      clock: { now: () => NOW },
    });

    // act
    const result = await useCase.execute({
      authSubjectId: "user_stranger",
      preference: IMPERIAL,
    });

    // assert
    expect(result).toEqual({ status: "not-on-journey" });
    expect(preferences.save).not.toHaveBeenCalled();
  });

  it("saves nothing for a client whose portal access has ended", async () => {
    // arrange
    const preferences = createPreferences();
    const useCase = new SaveUnitPreferenceUseCase({
      clients: createClients(reachOf("ended")),
      preferences,
      clock: { now: () => NOW },
    });

    // act
    const result = await useCase.execute({
      authSubjectId: "user_ana",
      preference: IMPERIAL,
    });

    // assert
    expect(result).toEqual({ status: "ended" });
    expect(preferences.save).not.toHaveBeenCalled();
  });

  it("saves the units of a client still awaiting her onboarding", async () => {
    // arrange
    const preferences = createPreferences();
    const useCase = new SaveUnitPreferenceUseCase({
      clients: createClients(reachOf("awaiting_onboarding")),
      preferences,
      clock: { now: () => NOW },
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
