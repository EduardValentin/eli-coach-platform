import { describe, expect, it } from "vitest";

import { ClientProfile, type ClientProfileSnapshot } from "./client-profile";
import type {
  CoachingFactsSnapshot,
  SharedCoachingFacts,
} from "./coaching-facts";

const OPENED_AT = new Date("2026-09-20T10:00:00.000Z");
const SEEDED_AT = new Date("2026-09-30T10:00:00.000Z");
const CONSENTED_AT = new Date("2026-09-29T09:45:00.000Z");
const NOW = new Date("2026-10-02T12:00:00.000Z");

const COACHING: CoachingFactsSnapshot = {
  heightCm: 168,
  trainingDays: 3,
  sessionMinutes: 60,
  equipment: ["Full gym"],
  trainingPlace: "Gym",
  limitations: "",
  level: "beginner",
  primaryGoal: "Lose fat",
  goalWeightKg: 62,
  activityLevel: "Lightly active",
  cycleMode: "adapted",
  dietaryRestrictions: "None",
};

const SHARED: SharedCoachingFacts = {
  heightCm: 170,
  trainingDays: 4,
  sessionMinutes: 45,
  equipment: ["Dumbbells", "Resistance bands"],
  trainingPlace: "Home",
  limitations: "Knee pain on deep squats.",
};

const SEEDED: ClientProfileSnapshot = {
  clientId: "client-1",
  coaching: COACHING,
  coachNotes: null,
  coachingSeededAt: SEEDED_AT,
  progressPhotosConsentedAt: CONSENTED_AT,
  createdAt: OPENED_AT,
  updatedAt: SEEDED_AT,
};

function unseeded(): ClientProfile {
  return ClientProfile.opened({ clientId: "client-1", now: OPENED_AT });
}

describe("ClientProfile.opened", () => {
  it("opens her profile at admission with no coaching facts, notes or consent yet", () => {
    // arrange
    const input = { clientId: "client-1", now: OPENED_AT };

    // act
    const profile = ClientProfile.opened(input);

    // assert
    expect(profile.toSnapshot()).toEqual({
      clientId: "client-1",
      coaching: null,
      coachNotes: null,
      coachingSeededAt: null,
      progressPhotosConsentedAt: null,
      createdAt: OPENED_AT,
      updatedAt: OPENED_AT,
    });
  });
});

describe("ClientProfile#editSharedFacts", () => {
  it("changes the facts she shares with her coach and keeps the coach's", () => {
    // arrange
    const profile = ClientProfile.reconstitute(SEEDED);

    // act
    const outcome = profile.editSharedFacts(SHARED, NOW);

    // assert
    expect(outcome.status === "edited" && outcome.profile.toSnapshot()).toEqual(
      { ...SEEDED, coaching: { ...COACHING, ...SHARED }, updatedAt: NOW },
    );
  });

  it("refuses while her coaching facts are not seeded", () => {
    // arrange
    const profile = unseeded();

    // act
    const outcome = profile.editSharedFacts(SHARED, NOW);

    // assert
    expect(outcome).toEqual({ status: "not-seeded" });
  });

  it("names the problems with a shared fact outside the rules", () => {
    // arrange
    const profile = ClientProfile.reconstitute(SEEDED);

    // act
    const outcome = profile.editSharedFacts(
      { ...SHARED, limitations: "a".repeat(501) },
      NOW,
    );

    // assert
    expect(outcome).toEqual({
      status: "invalid",
      problems: { limitations: "too-long" },
    });
  });
});

describe("ClientProfile#editCoachFacts", () => {
  it("replaces her coaching facts and the coach's private notes", () => {
    // arrange
    const profile = ClientProfile.reconstitute(SEEDED);
    const coaching = { ...COACHING, level: "intermediate" as const };

    // act
    const outcome = profile.editCoachFacts(
      { coaching, coachNotes: "  Prefers morning sessions.  " },
      NOW,
    );

    // assert
    expect(outcome.status === "edited" && outcome.profile.toSnapshot()).toEqual(
      {
        ...SEEDED,
        coaching,
        coachNotes: "Prefers morning sessions.",
        updatedAt: NOW,
      },
    );
  });

  it("clears the notes when the coach empties them", () => {
    // arrange
    const profile = ClientProfile.reconstitute({
      ...SEEDED,
      coachNotes: "Old note.",
    });

    // act
    const outcome = profile.editCoachFacts(
      { coaching: COACHING, coachNotes: "   " },
      NOW,
    );

    // assert
    expect(
      outcome.status === "edited" && outcome.profile.toSnapshot().coachNotes,
    ).toBeNull();
  });

  it("refuses while her coaching facts are not seeded", () => {
    // arrange
    const profile = unseeded();

    // act
    const outcome = profile.editCoachFacts(
      { coaching: COACHING, coachNotes: null },
      NOW,
    );

    // assert
    expect(outcome).toEqual({ status: "not-seeded" });
  });

  it("names every problem with the facts and notes together", () => {
    // arrange
    const profile = ClientProfile.reconstitute(SEEDED);

    // act
    const outcome = profile.editCoachFacts(
      {
        coaching: { ...COACHING, goalWeightKg: 400 },
        coachNotes: "a".repeat(501),
      },
      NOW,
    );

    // assert
    expect(outcome).toEqual({
      status: "invalid",
      problems: { goalWeightKg: "out-of-range", coachNotes: "too-long" },
    });
  });
});

describe("ClientProfile#hasPhotoConsent", () => {
  it("holds once she agreed to share progress photos", () => {
    // arrange
    const profile = ClientProfile.reconstitute(SEEDED);

    // act
    const consented = profile.hasPhotoConsent();

    // assert
    expect(consented).toBe(true);
  });

  it("does not hold while she has not agreed", () => {
    // arrange
    const profile = unseeded();

    // act
    const consented = profile.hasPhotoConsent();

    // assert
    expect(consented).toBe(false);
  });
});

describe("ClientProfile.reconstitute", () => {
  it("gives back the snapshot it was rebuilt from", () => {
    // arrange
    // act
    const profile = ClientProfile.reconstitute(SEEDED);

    // assert
    expect(profile.toSnapshot()).toEqual(SEEDED);
  });
});
