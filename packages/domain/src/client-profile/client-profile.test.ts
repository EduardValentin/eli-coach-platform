import { describe, expect, it } from "vitest";

import {
  ClientProfile,
  type ClientProfileIdentity,
  type ClientProfileSnapshot,
  type OnboardingProfileFacts,
} from "./client-profile";

const NOW = new Date("2026-09-30T10:00:00.000Z");

const IDENTITY: ClientProfileIdentity = {
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
  startingWeightKg: 64.5,
  activityLevel: "Lightly active",
  primaryGoal: "Lose fat",
  dietaryRestrictions: "Vegetarian, Lactose",
  clientNotes: "I travel a lot.",
};

describe("ClientProfile.fromOnboarding", () => {
  it("takes her identity and onboarding facts, and her current weight from her latest measurement", () => {
    // arrange
    const latestMeasurement = {
      recordedAt: NOW,
      weightKg: 63.8,
      waistCm: 72,
    };

    // act
    const profile = ClientProfile.fromOnboarding({
      identity: IDENTITY,
      facts: FACTS,
      latestMeasurement,
      now: NOW,
    });

    // assert
    expect(profile.toSnapshot()).toEqual({
      ...IDENTITY,
      ...FACTS,
      currentWeightKg: 63.8,
      updatedAt: NOW,
    });
  });

  it("keeps only her identity fields from a wider client record", () => {
    // arrange
    const client = { ...IDENTITY, submittedAt: NOW, reviewStamps: {} };

    // act
    const profile = ClientProfile.fromOnboarding({
      identity: client,
      facts: FACTS,
      latestMeasurement: null,
      now: NOW,
    });

    // assert
    expect(profile.toSnapshot()).toEqual({
      ...IDENTITY,
      ...FACTS,
      currentWeightKg: null,
      updatedAt: NOW,
    });
  });

  it("has no current weight while she has no measurement", () => {
    // arrange, act
    const profile = ClientProfile.fromOnboarding({
      identity: IDENTITY,
      facts: FACTS,
      latestMeasurement: null,
      now: NOW,
    });

    // assert
    expect(profile.toSnapshot().currentWeightKg).toBeNull();
  });
});

describe("ClientProfile.reconstitute", () => {
  it("gives back the snapshot it was rebuilt from", () => {
    // arrange
    const snapshot: ClientProfileSnapshot = {
      ...IDENTITY,
      ...FACTS,
      phone: null,
      currentWeightKg: 62,
      updatedAt: NOW,
    };

    // act
    const profile = ClientProfile.reconstitute(snapshot);

    // assert
    expect(profile.toSnapshot()).toEqual(snapshot);
  });
});
