import { describe, expect, it, vi } from "vitest";

import type { ClientIdentities, ClientIdentity } from "../client";
import type {
  ClientMeasurementsSource,
  MeasurementEntry,
} from "../measurement";
import { ClientProfile, type OnboardingProfileFacts } from "./client-profile";
import type { ClientProfiles } from "./client-profiles";
import { ReadClientProfileUseCase } from "./read-client-profile-use-case";

const IDENTITY: ClientIdentity = {
  clientId: "client-1",
  firstName: "Ana",
  lastName: "Popescu",
  email: "ana@example.com",
  dateOfBirth: "1994-03-14",
  gender: "female",
  country: "RO",
  phone: "+40712345678",
};

const FACTS: OnboardingProfileFacts = {
  heightCm: 168,
  activityLevel: "Lightly active",
  primaryGoal: "Lose fat",
  dietaryRestrictions: "None",
  clientNotes: null,
};

const FIRST_ENTRY: MeasurementEntry = {
  recordedAt: new Date("2026-09-27T10:00:00.000Z"),
  weightKg: 64.5,
  waistCm: 72,
};

const LATEST_ENTRY: MeasurementEntry = {
  recordedAt: new Date("2026-09-29T10:00:00.000Z"),
  weightKg: 63.8,
  waistCm: 71,
};

function createUseCase(stored: {
  identity: ClientIdentity | null;
  profile: ClientProfile | null;
  measurements: MeasurementEntry[];
}) {
  const ports = {
    identities: {
      findByClientId: vi.fn().mockResolvedValue(stored.identity),
    } satisfies ClientIdentities,
    profiles: {
      findByClientId: vi.fn().mockResolvedValue(stored.profile),
    } satisfies ClientProfiles,
    measurements: {
      listByClientId: vi.fn().mockResolvedValue(stored.measurements),
    } satisfies ClientMeasurementsSource,
  };

  return { ports, useCase: new ReadClientProfileUseCase(ports) };
}

function profileWith(facts: OnboardingProfileFacts): ClientProfile {
  return ClientProfile.fromOnboarding({
    clientId: IDENTITY.clientId,
    facts,
    now: new Date("2026-09-27T10:00:00.000Z"),
  });
}

describe("ReadClientProfileUseCase", () => {
  it("reads her identity from her client record, her onboarding facts and her first and latest weights", async () => {
    // arrange
    const { ports, useCase } = createUseCase({
      identity: IDENTITY,
      profile: profileWith(FACTS),
      measurements: [LATEST_ENTRY, FIRST_ENTRY],
    });

    // act
    const reading = await useCase.execute("client-1");

    // assert
    expect(reading).toEqual({
      identity: IDENTITY,
      facts: FACTS,
      startingWeightKg: 64.5,
      currentWeightKg: 63.8,
    });
    expect(ports.identities.findByClientId).toHaveBeenCalledWith("client-1");
    expect(ports.profiles.findByClientId).toHaveBeenCalledWith("client-1");
    expect(ports.measurements.listByClientId).toHaveBeenCalledWith("client-1");
  });

  it("reads her identity alone while she has not sent her onboarding", async () => {
    // arrange
    const { useCase } = createUseCase({
      identity: IDENTITY,
      profile: null,
      measurements: [],
    });

    // act
    const reading = await useCase.execute("client-1");

    // assert
    expect(reading).toEqual({
      identity: IDENTITY,
      facts: null,
      startingWeightKg: null,
      currentWeightKg: null,
    });
  });

  it("answers nothing for someone who is not a client, reading nothing more", async () => {
    // arrange
    const { ports, useCase } = createUseCase({
      identity: null,
      profile: null,
      measurements: [],
    });

    // act
    const reading = await useCase.execute("client-1");

    // assert
    expect(reading).toBeNull();
    expect(ports.profiles.findByClientId).not.toHaveBeenCalled();
    expect(ports.measurements.listByClientId).not.toHaveBeenCalled();
  });
});
