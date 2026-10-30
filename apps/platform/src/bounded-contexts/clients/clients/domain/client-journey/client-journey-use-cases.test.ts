import { describe, expect, it, vi } from "vitest";

import type { CoachingStandingSnapshot } from "../client";

import { ClientJourney, type ClientJourneySnapshot } from "./client-journey";
import type { ClientJourneysPort } from "./client-journeys-port";
import { MarkWelcomeSeenUseCase } from "./mark-welcome-seen-use-case";
import { ReadClientJourneyUseCase } from "./read-client-journey-use-case";
import { ReadClientPortalStandingUseCase } from "./read-client-portal-standing-use-case";

const NOW = new Date("2026-09-27T10:00:00.000Z");
const WELCOME_SEEN_AT = new Date("2026-09-27T09:00:00.000Z");
const SUBMITTED_AT = new Date("2026-09-28T10:00:00.000Z");

const OPENED_AT = new Date("2026-09-28T11:00:00.000Z");
const ASKED_AT = new Date("2026-09-28T12:00:00.000Z");

const NO_REVIEW_STAMPS = {
  reviewOpenedAt: null,
  detailsRequestedAt: null,
  detailsAnsweredAt: null,
  answersApprovedAt: null,
};

const NOT_STARTED: CoachingStandingSnapshot = {
  status: "not-started",
  accessEndsAt: null,
  refundDue: false,
  bundleMonths: null,
  programStartsAt: null,
  paidThrough: null,
};

function journey(
  welcomeSeenAt: Date | null,
  onboardingSubmittedAt: Date | null = null,
  overrides: Partial<ClientJourneySnapshot> = {},
): ClientJourney {
  return ClientJourney.from({
    clientId: "client-1",
    firstName: "Ana",
    gender: "female",
    lastName: "Popescu",
    welcomeSeenAt,
    onboardingSubmittedAt,
    ...NO_REVIEW_STAMPS,
    standing: NOT_STARTED,
    ...overrides,
  });
}

function createJourneys(found: ClientJourney | null) {
  return {
    findByAuthSubjectId: vi.fn().mockResolvedValue(found),
    recordWelcomeSeen: vi.fn().mockResolvedValue(undefined),
    recordOnboardingSubmitted: vi.fn().mockResolvedValue(undefined),
  } satisfies ClientJourneysPort;
}

describe("ReadClientJourneyUseCase", () => {
  it.each([
    ["the journey of a bound client", journey(null)],
    ["nothing for a subject bound to no client", null],
  ])("answers %s", async (_label, found) => {
    // arrange
    const journeys = createJourneys(found);
    const useCase = new ReadClientJourneyUseCase({ journeys });

    // act
    const result = await useCase.execute("user_ana");

    // assert
    expect(result).toBe(found);
    expect(journeys.findByAuthSubjectId).toHaveBeenCalledWith("user_ana");
  });
});

describe("MarkWelcomeSeenUseCase", () => {
  it("records welcome as seen now for a client on the welcome step", async () => {
    // arrange
    const journeys = createJourneys(journey(null));
    const useCase = new MarkWelcomeSeenUseCase({
      clock: { now: () => NOW },
      journeys,
    });

    // act
    const result = await useCase.execute("user_ana");

    // assert
    expect(result).toEqual({ status: "welcome-seen" });
    expect(journeys.recordWelcomeSeen).toHaveBeenCalledWith({
      clientId: "client-1",
      at: NOW,
    });
  });

  it("keeps the first moment she saw welcome", async () => {
    // arrange
    const journeys = createJourneys(
      journey(new Date("2026-09-26T10:00:00.000Z")),
    );
    const useCase = new MarkWelcomeSeenUseCase({
      clock: { now: () => NOW },
      journeys,
    });

    // act
    const result = await useCase.execute("user_ana");

    // assert
    expect(result).toEqual({ status: "welcome-seen" });
    expect(journeys.recordWelcomeSeen).not.toHaveBeenCalled();
  });

  it("answers not-on-journey for a subject bound to no client", async () => {
    // arrange
    const journeys = createJourneys(null);
    const useCase = new MarkWelcomeSeenUseCase({
      clock: { now: () => NOW },
      journeys,
    });

    // act
    const result = await useCase.execute("user_coach");

    // assert
    expect(result).toEqual({ status: "not-on-journey" });
    expect(journeys.recordWelcomeSeen).not.toHaveBeenCalled();
  });
});

describe("ReadClientPortalStandingUseCase", () => {
  const ACCESS_END = new Date("2026-12-26T10:00:00.000Z");
  const ENDED: CoachingStandingSnapshot = {
    status: "ended",
    accessEndsAt: NOW,
    refundDue: false,
    bundleMonths: 3,
    programStartsAt: null,
    paidThrough: null,
  };

  function standingUseCase(options: {
    found: ClientJourney | null;
    now: Date;
  }) {
    const journeys = createJourneys(options.found);

    return {
      journeys,
      useCase: new ReadClientPortalStandingUseCase({
        clock: { now: () => options.now },
        journeys,
      }),
    };
  }

  it("answers her portal reachable to a client who submitted onboarding and whose coaching is active", async () => {
    // arrange
    const found = journey(WELCOME_SEEN_AT, SUBMITTED_AT, {
      standing: {
        status: "active",
        accessEndsAt: null,
        refundDue: false,
        bundleMonths: 3,
        programStartsAt: null,
        paidThrough: null,
      },
    });
    const { useCase, journeys } = standingUseCase({ found, now: NOW });

    // act
    const standing = await useCase.execute("user_ana");

    // assert
    expect(standing).toEqual({ journey: found, portal: "reachable" });
    expect(journeys.findByAuthSubjectId).toHaveBeenCalledWith("user_ana");
  });

  it("keeps the portal reachable to a client the coach sent back for details", async () => {
    // arrange
    const found = journey(WELCOME_SEEN_AT, SUBMITTED_AT, {
      reviewOpenedAt: OPENED_AT,
      detailsRequestedAt: ASKED_AT,
    });
    const { useCase } = standingUseCase({ found, now: NOW });

    // act
    const standing = await useCase.execute("user_ana");

    // assert
    expect(standing).toEqual({ journey: found, portal: "reachable" });
  });

  it.each([
    ["has not seen welcome", journey(null)],
    ["has not submitted onboarding", journey(WELCOME_SEEN_AT)],
  ])(
    "answers her portal awaiting onboarding to a client who %s, though her coaching is active",
    async (_label, found) => {
      // arrange
      const { useCase } = standingUseCase({ found, now: NOW });

      // act
      const standing = await useCase.execute("user_ana");

      // assert
      expect(standing).toEqual({
        journey: found,
        portal: "awaiting_onboarding",
      });
    },
  );

  it.each([
    ["ended", ENDED, NOW],
    [
      "cancelled and past her access end",
      {
        status: "cancelled",
        accessEndsAt: ACCESS_END,
        refundDue: false,
        bundleMonths: 3,
        programStartsAt: null,
        paidThrough: null,
      } satisfies CoachingStandingSnapshot,
      ACCESS_END,
    ],
  ])(
    "answers her portal ended to a submitted client whose coaching is %s",
    async (_label, standingSnapshot, now) => {
      // arrange
      const found = journey(WELCOME_SEEN_AT, SUBMITTED_AT, {
        standing: standingSnapshot,
      });
      const { useCase } = standingUseCase({ found, now });

      // act
      const standing = await useCase.execute("user_ana");

      // assert
      expect(standing).toEqual({ journey: found, portal: "ended" });
    },
  );

  it("answers her portal ended to a client who never submitted onboarding", async () => {
    // arrange
    const found = journey(WELCOME_SEEN_AT, null, { standing: ENDED });
    const { useCase } = standingUseCase({ found, now: NOW });

    // act
    const standing = await useCase.execute("user_ana");

    // assert
    expect(standing).toEqual({ journey: found, portal: "ended" });
  });

  it("answers her portal reachable to a submitted client whose coaching has not started", async () => {
    // arrange
    const found = journey(WELCOME_SEEN_AT, SUBMITTED_AT);
    const { useCase } = standingUseCase({ found, now: NOW });

    // act
    const standing = await useCase.execute("user_ana");

    // assert
    expect(standing).toEqual({ journey: found, portal: "reachable" });
  });

  it("answers no standing for a subject bound to no client", async () => {
    // arrange
    const { useCase } = standingUseCase({ found: null, now: NOW });

    // act
    const standing = await useCase.execute("user_ana");

    // assert
    expect(standing).toBeNull();
  });
});
