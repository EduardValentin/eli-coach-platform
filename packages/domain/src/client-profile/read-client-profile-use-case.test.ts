import { describe, expect, it, vi } from "vitest";

import { ClientProfile, type ClientProfileSnapshot } from "./client-profile";
import type { ClientProfiles } from "./client-profiles";
import { ReadClientProfileUseCase } from "./read-client-profile-use-case";

const SNAPSHOT: ClientProfileSnapshot = {
  clientId: "client-1",
  firstName: "Ana",
  lastName: "Popescu",
  email: "ana@example.com",
  dateOfBirth: "1994-03-14",
  gender: "female",
  country: "RO",
  phone: null,
  heightCm: 168,
  startingWeightKg: 64.5,
  currentWeightKg: 64.5,
  activityLevel: "Lightly active",
  primaryGoal: "Lose fat",
  dietaryRestrictions: "None",
  clientNotes: null,
  updatedAt: new Date("2026-09-30T10:00:00.000Z"),
};

function createProfiles(found: ClientProfile | null) {
  return {
    findByClientId: vi.fn().mockResolvedValue(found),
  } satisfies ClientProfiles;
}

describe("ReadClientProfileUseCase", () => {
  it("reads her profile as a snapshot", async () => {
    // arrange
    const profiles = createProfiles(ClientProfile.reconstitute(SNAPSHOT));
    const useCase = new ReadClientProfileUseCase({ profiles });

    // act
    const result = await useCase.execute("client-1");

    // assert
    expect(result).toEqual(SNAPSHOT);
    expect(profiles.findByClientId).toHaveBeenCalledWith("client-1");
  });

  it("answers nothing before she has sent her onboarding", async () => {
    // arrange
    const useCase = new ReadClientProfileUseCase({
      profiles: createProfiles(null),
    });

    // act
    const result = await useCase.execute("client-1");

    // assert
    expect(result).toBeNull();
  });
});
