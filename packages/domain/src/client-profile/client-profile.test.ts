import { describe, expect, it } from "vitest";

import {
  ClientProfile,
  type ClientProfileSnapshot,
  type OnboardingProfileFacts,
} from "./client-profile";

const NOW = new Date("2026-09-30T10:00:00.000Z");
const CONSENTED_AT = new Date("2026-09-30T09:45:00.000Z");

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
      progressPhotosConsentedAt: CONSENTED_AT,
      now: NOW,
    });

    // assert
    expect(profile.toSnapshot()).toEqual({
      clientId: "client-1",
      ...FACTS,
      progressPhotosConsentedAt: CONSENTED_AT,
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
      progressPhotosConsentedAt: null,
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
      progressPhotosConsentedAt: null,
      updatedAt: NOW,
    };

    // act
    const profile = ClientProfile.reconstitute(snapshot);

    // assert
    expect(profile.toSnapshot()).toEqual(snapshot);
  });
});

describe("ClientProfile#hasPhotoConsent", () => {
  it("holds once she agreed to share progress photos", () => {
    // arrange
    const profile = ClientProfile.fromOnboarding({
      clientId: "client-1",
      facts: FACTS,
      progressPhotosConsentedAt: CONSENTED_AT,
      now: NOW,
    });

    // act
    const consented = profile.hasPhotoConsent();

    // assert
    expect(consented).toBe(true);
  });

  it("does not hold while she has not agreed", () => {
    // arrange
    const profile = ClientProfile.fromOnboarding({
      clientId: "client-1",
      facts: FACTS,
      progressPhotosConsentedAt: null,
      now: NOW,
    });

    // act
    const consented = profile.hasPhotoConsent();

    // assert
    expect(consented).toBe(false);
  });
});
