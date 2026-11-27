import { describe, expect, it } from "vitest";

import type { OnboardingReviewsPort } from "../client-onboarding";
import { ClientProfile, type ClientProfilesPort } from "../client-profile";

import { ReadClientCoachingUseCase } from "./read-client-coaching-use-case";

const SEEDED_AT = new Date("2026-09-30T10:00:00.000Z");
const APPROVED_AT = new Date("2026-09-30T10:00:00.000Z");

const PROFILE = ClientProfile.reconstitute({
  clientId: "client-1",
  coaching: {
    heightCm: 168,
    trainingDays: 3,
    sessionMinutes: 45,
    equipment: ["Dumbbells", "Resistance bands"],
    trainingPlace: "Home",
    limitations: "Left knee, no deep lunges",
    level: "beginner",
    primaryGoal: "Build muscle",
    goalWeightKg: null,
    activityLevel: null,
    cycleMode: "adapted",
    dietaryRestrictions: "None",
  },
  coachNotes: null,
  coachingSeededAt: SEEDED_AT,
  progressPhotosConsentedAt: null,
  createdAt: SEEDED_AT,
  updatedAt: SEEDED_AT,
});

type StoredClient = {
  approvedAt?: Date | null;
  profile?: ClientProfile | null;
};

function readClientCoachingUseCaseOver(stored: StoredClient = {}) {
  const profile = stored.profile === undefined ? PROFILE : stored.profile;
  const onboardingReviewsPort: Pick<OnboardingReviewsPort, "findByClientId"> = {
    findByClientId: async () => ({
      openedAt: SEEDED_AT,
      approvedAt: stored.approvedAt ?? null,
      requests: [],
    }),
  };
  const clientProfilesPort: Pick<ClientProfilesPort, "findByClientId"> = {
    findByClientId: async (clientId) =>
      profile?.toSnapshot().clientId === clientId ? profile : null,
  };

  return new ReadClientCoachingUseCase({
    onboardingReviewsPort,
    clientProfilesPort,
  });
}

describe("ReadClientCoachingUseCase", () => {
  it("answers whether her answers are approved, her coaching facts and the equipment she may choose from", async () => {
    // arrange
    const readClientCoachingUseCase = readClientCoachingUseCaseOver({
      approvedAt: APPROVED_AT,
    });

    // act
    const coaching = await readClientCoachingUseCase.execute("client-1");

    // assert
    expect(coaching).toMatchObject({
      clientId: "client-1",
      answersApproved: true,
      facts: {
        primaryGoal: "Build muscle",
        level: "beginner",
        trainingDays: 3,
        sessionMinutes: 45,
        equipment: ["Dumbbells", "Resistance bands"],
        trainingPlace: "Home",
        limitations: "Left knee, no deep lunges",
      },
    });
    expect(coaching.equipmentOptions).toEqual([
      { equipment: "Full gym", exclusive: false },
      { equipment: "Machines", exclusive: false },
      { equipment: "Barbell", exclusive: false },
      { equipment: "Dumbbells", exclusive: false },
      { equipment: "Kettlebells", exclusive: false },
      { equipment: "Resistance bands", exclusive: false },
      { equipment: "Bodyweight only", exclusive: true },
    ]);
  });

  it("answers the primary goals her goal may be chosen from", async () => {
    // arrange
    const readClientCoachingUseCase = readClientCoachingUseCaseOver({
      approvedAt: APPROVED_AT,
    });

    // act
    const coaching = await readClientCoachingUseCase.execute("client-1");

    // assert
    expect(coaching.primaryGoalOptions).toEqual([
      "Lose fat",
      "Build muscle",
      "Maintain a healthy weight",
      "Learn to balance activity and nutrition",
      "Improve overall health",
      "Work with my menstrual cycle",
    ]);
  });

  it("reports her answers unapproved while her review has no approval", async () => {
    // arrange
    const readClientCoachingUseCase = readClientCoachingUseCaseOver({
      approvedAt: null,
    });

    // act
    const coaching = await readClientCoachingUseCase.execute("client-1");

    // assert
    expect(coaching.answersApproved).toBe(false);
  });

  it("answers no coaching facts for a client whose profile was never seeded", async () => {
    // arrange
    const readClientCoachingUseCase = readClientCoachingUseCaseOver({
      profile: null,
    });

    // act
    const coaching = await readClientCoachingUseCase.execute("client-1");

    // assert
    expect(coaching.facts).toBeNull();
  });

  it("answers unapproved answers, no facts and the options for a client it holds no rows for, leaving whether she exists to clients", async () => {
    // arrange
    const readClientCoachingUseCase = readClientCoachingUseCaseOver({
      approvedAt: null,
      profile: null,
    });

    // act
    const coaching = await readClientCoachingUseCase.execute("client-9");

    // assert
    expect(coaching).toMatchObject({
      clientId: "client-9",
      answersApproved: false,
      facts: null,
    });
    expect(coaching.equipmentOptions).toHaveLength(7);
    expect(coaching.primaryGoalOptions).toHaveLength(6);
  });
});
