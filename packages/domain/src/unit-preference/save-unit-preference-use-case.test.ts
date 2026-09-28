import { describe, expect, it, vi } from "vitest";

import type { ClientUnitPreferences } from "./client-unit-preferences";
import { SaveUnitPreferenceUseCase } from "./save-unit-preference-use-case";
import type { UnitPreferenceClients } from "./unit-preference-clients";
import { UnitPreference, type UnitPreferenceSnapshot } from "./unit-preference";

const NOW = new Date("2026-09-28T10:00:00.000Z");
const IMPERIAL: UnitPreferenceSnapshot = {
  weightUnit: "lb",
  heightUnit: "ft-in",
};

function createClients(found: { clientId: string } | null) {
  return {
    findByAuthSubjectId: vi.fn().mockResolvedValue(found),
  } satisfies UnitPreferenceClients;
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
    const clients = createClients({ clientId: "client-1" });
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
});
