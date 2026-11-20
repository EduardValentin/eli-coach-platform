import { describe, expect, it } from "vitest";

import {
  CoachingStanding,
  type CoachingStatus,
} from "~/bounded-contexts/clients/clients/domain/client";
import type {
  ClientIdentitiesPort,
  ClientIdentity,
} from "../client-identities-port";
import {
  OnboardingParticipants,
  type OnboardingClient,
  type OnboardingReviewsPort,
} from "../client-onboarding";
import { ClientProfile, type ClientProfilesPort } from "../client-profile";

import { ReadClientCoachingUseCase } from "./read-client-coaching-use-case";

const SEEDED_AT = new Date("2026-09-30T10:00:00.000Z");
const APPROVED_AT = new Date("2026-09-30T10:00:00.000Z");
const NOW = new Date("2026-11-21T12:00:00.000Z");
const BEFORE_NOW = new Date("2026-11-21T11:59:59.000Z");
const AFTER_NOW = new Date("2026-11-21T12:00:01.000Z");

const IDENTITY: ClientIdentity = {
  clientId: "client-1",
  firstName: "Ana",
  lastName: "Popescu",
  email: "ana@example.com",
  dateOfBirth: "1994-03-14",
  gender: "female",
  country: "RO",
  phone: null,
};

const PROFILE = ClientProfile.reconstitute({
  clientId: "client-1",
  coaching: {
    heightCm: 168,
    trainingDays: 3,
    sessionMinutes: 45,
    equipment: ["Dumbbells", "Resistance bands"],
    trainingPlace: "Home",
    limitations: "",
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
  status?: CoachingStatus;
  accessEndsAt?: Date | null;
  approvedAt?: Date | null;
  identity?: ClientIdentity | null;
  onboarding?: "known" | "unknown";
  profile?: ClientProfile | null;
};

function onboardingClientOf(stored: StoredClient): OnboardingClient {
  return {
    clientId: "client-1",
    submittedAt: SEEDED_AT,
    reviewStamps: {
      reviewOpenedAt: null,
      detailsRequestedAt: null,
      detailsAnsweredAt: null,
      answersApprovedAt: null,
    },
    standing: CoachingStanding.of({
      status: stored.status ?? "active",
      accessEndsAt: stored.accessEndsAt ?? null,
      refundDue: false,
      bundleMonths: null,
      programStartsAt: null,
      paidThrough: null,
    }),
  };
}

function readClientCoachingUseCaseOver(stored: StoredClient = {}) {
  const onboardingClient =
    stored.onboarding === "unknown" ? null : onboardingClientOf(stored);
  const identity = stored.identity === undefined ? IDENTITY : stored.identity;
  const profile = stored.profile === undefined ? PROFILE : stored.profile;
  const clientIdentitiesPort: Pick<ClientIdentitiesPort, "findByClientId"> = {
    findByClientId: async (clientId) =>
      identity?.clientId === clientId ? identity : null,
  };
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
    clockPort: { now: () => NOW },
    participants: new OnboardingParticipants({
      onboardingClientsPort: {
        findByAuthSubjectId: async () => null,
        findByClientId: async (clientId) =>
          onboardingClient?.clientId === clientId ? onboardingClient : null,
      },
      clientIdentitiesPort,
    }),
    onboardingReviewsPort,
    clientProfilesPort,
  });
}

describe("ReadClientCoachingUseCase", () => {
  it("answers who she is, her coaching facts and the equipment she may choose from", async () => {
    // arrange
    const readClientCoachingUseCase = readClientCoachingUseCaseOver({
      approvedAt: APPROVED_AT,
    });

    // act
    const coaching = await readClientCoachingUseCase.execute("client-1");

    // assert
    expect(coaching).toMatchObject({
      clientId: "client-1",
      firstName: "Ana",
      lastName: "Popescu",
      gender: "female",
      answersApproved: true,
      coachingEnded: false,
      facts: {
        primaryGoal: "Build muscle",
        level: "beginner",
        trainingDays: 3,
        sessionMinutes: 45,
        equipment: ["Dumbbells", "Resistance bands"],
      },
    });
    expect(coaching?.equipmentOptions).toEqual([
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
    expect(coaching?.primaryGoalOptions).toEqual([
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
    expect(coaching?.answersApproved).toBe(false);
  });

  it("reports her coaching ongoing while a cancelled standing still gives her access", async () => {
    // arrange
    const readClientCoachingUseCase = readClientCoachingUseCaseOver({
      status: "cancelled",
      accessEndsAt: AFTER_NOW,
      approvedAt: APPROVED_AT,
    });

    // act
    const coaching = await readClientCoachingUseCase.execute("client-1");

    // assert
    expect(coaching?.coachingEnded).toBe(false);
  });

  it("reports her coaching ended once a cancelled standing's access is over", async () => {
    // arrange
    const readClientCoachingUseCase = readClientCoachingUseCaseOver({
      status: "cancelled",
      accessEndsAt: BEFORE_NOW,
      approvedAt: APPROVED_AT,
    });

    // act
    const coaching = await readClientCoachingUseCase.execute("client-1");

    // assert
    expect(coaching?.coachingEnded).toBe(true);
  });

  it("reports her coaching ended from an ended standing", async () => {
    // arrange
    const readClientCoachingUseCase = readClientCoachingUseCaseOver({
      status: "ended",
      accessEndsAt: AFTER_NOW,
      approvedAt: APPROVED_AT,
    });

    // act
    const coaching = await readClientCoachingUseCase.execute("client-1");

    // assert
    expect(coaching?.coachingEnded).toBe(true);
  });

  it.each<CoachingStatus>(["not-started", "active"])(
    "reports her coaching ongoing from a %s standing",
    async (status) => {
      // arrange
      const readClientCoachingUseCase = readClientCoachingUseCaseOver({
        status,
        approvedAt: APPROVED_AT,
      });

      // act
      const coaching = await readClientCoachingUseCase.execute("client-1");

      // assert
      expect(coaching?.coachingEnded).toBe(false);
    },
  );

  it("answers no coaching facts for a client whose profile was never seeded", async () => {
    // arrange
    const readClientCoachingUseCase = readClientCoachingUseCaseOver({
      profile: null,
    });

    // act
    const coaching = await readClientCoachingUseCase.execute("client-1");

    // assert
    expect(coaching?.facts).toBeNull();
  });

  it("answers nothing for a client no one knows", async () => {
    // arrange
    const readClientCoachingUseCase = readClientCoachingUseCaseOver({
      onboarding: "unknown",
    });

    // act
    const coaching = await readClientCoachingUseCase.execute("client-1");

    // assert
    expect(coaching).toBeNull();
  });

  it("answers nothing for a client without an identity", async () => {
    // arrange
    const readClientCoachingUseCase = readClientCoachingUseCaseOver({
      identity: null,
    });

    // act
    const coaching = await readClientCoachingUseCase.execute("client-1");

    // assert
    expect(coaching).toBeNull();
  });
});
