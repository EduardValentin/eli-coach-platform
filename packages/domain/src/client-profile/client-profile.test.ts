import { describe, expect, it } from "vitest";

import {
  ClientProfile,
  type ClientProfileSnapshot,
  type OnboardingProfileFacts,
} from "./client-profile";

const NOW = new Date("2026-09-30T10:00:00.000Z");

const FACTS: OnboardingProfileFacts = {
  heightCm: 168,
  activityLevel: "Lightly active",
  primaryGoal: "Lose fat",
  dietaryRestrictions: "Vegetarian, Lactose",
  clientNotes: "I travel a lot.",
};

describe("ClientProfile.fromOnboarding", () => {
  it("holds the facts she stated at onboarding for her client record", () => {
    // arrange, act
    const profile = ClientProfile.fromOnboarding({
      clientId: "client-1",
      facts: FACTS,
      now: NOW,
    });

    // assert
    expect(profile.toSnapshot()).toEqual({
      clientId: "client-1",
      ...FACTS,
      updatedAt: NOW,
    });
  });

  it("keeps only her profile facts from wider onboarding facts", () => {
    // arrange
    const facts = { ...FACTS, weightKg: 64.5, firstName: "Ana" };

    // act
    const profile = ClientProfile.fromOnboarding({
      clientId: "client-1",
      facts,
      now: NOW,
    });

    // assert
    expect(profile.facts()).toEqual(FACTS);
  });
});

describe("ClientProfile.reconstitute", () => {
  it("gives back the snapshot it was rebuilt from", () => {
    // arrange
    const snapshot: ClientProfileSnapshot = {
      clientId: "client-1",
      ...FACTS,
      clientNotes: null,
      updatedAt: NOW,
    };

    // act
    const profile = ClientProfile.reconstitute(snapshot);

    // assert
    expect(profile.toSnapshot()).toEqual(snapshot);
  });
});
