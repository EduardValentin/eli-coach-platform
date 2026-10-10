import { describe, expect, it, vi } from "vitest";

import {
  CoachingSubscription,
  type CoachingSubscriptions,
  type CoachingSubscriptionSnapshot,
  type StartChoice,
} from "../coaching-subscription";

import { ClientJourney, type ClientJourneySnapshot } from "./client-journey";
import type { ClientJourneys } from "./client-journeys";
import { MarkWelcomeSeenUseCase } from "./mark-welcome-seen-use-case";
import { ReadClientJourneyUseCase } from "./read-client-journey-use-case";
import { ReadClientPortalStandingUseCase } from "./read-client-portal-standing-use-case";
import { ReadProgramStatusUseCase } from "./read-program-status-use-case";

const NOW = new Date("2026-09-27T10:00:00.000Z");
const WELCOME_SEEN_AT = new Date("2026-09-27T09:00:00.000Z");
const SUBMITTED_AT = new Date("2026-09-28T10:00:00.000Z");
const PURCHASED_AT = new Date("2026-09-26T10:00:00.000Z");

const OPENED_AT = new Date("2026-09-28T11:00:00.000Z");
const ASKED_AT = new Date("2026-09-28T12:00:00.000Z");

const NO_REVIEW_STAMPS = {
  reviewOpenedAt: null,
  detailsRequestedAt: null,
  detailsAnsweredAt: null,
  answersApprovedAt: null,
};

function journey(
  welcomeSeenAt: Date | null,
  onboardingSubmittedAt: Date | null = null,
  reviewStamps: Partial<ClientJourneySnapshot> = {},
): ClientJourney {
  return ClientJourney.from({
    clientId: "client-1",
    firstName: "Ana",
    gender: "female",
    lastName: "Popescu",
    welcomeSeenAt,
    onboardingSubmittedAt,
    ...NO_REVIEW_STAMPS,
    ...reviewStamps,
  });
}

function createJourneys(found: ClientJourney | null) {
  return {
    findByAuthSubjectId: vi.fn().mockResolvedValue(found),
    recordWelcomeSeen: vi.fn().mockResolvedValue(undefined),
    recordOnboardingSubmitted: vi.fn().mockResolvedValue(undefined),
  } satisfies ClientJourneys;
}

function subscriptionOf(
  overrides: Partial<CoachingSubscriptionSnapshot> & {
    startChoice: StartChoice;
  },
): CoachingSubscription {
  return CoachingSubscription.reconstitute({
    id: "subscription-1",
    clientId: "client-1",
    bundleId: "3-months",
    months: 3,
    tier: "regular",
    amountCents: 44700,
    currency: "eur",
    paymentCustomerId: "cus_1",
    paymentSubscriptionId: "sub_1",
    checkoutSessionId: "cs_1",
    paidAt: PURCHASED_AT,
    status: "not-started",
    cancelledAt: null,
    accessEndsAt: null,
    paymentProblemSince: null,
    refund: null,
    ...overrides,
  });
}

function createSubscriptions(found: CoachingSubscription | null) {
  return {
    findCurrentForClient: vi.fn().mockResolvedValue(found),
    findCurrentForAuthSubject: vi.fn(),
    findByPaymentSubscriptionId: vi.fn(),
    findCurrentByPaymentCustomerId: vi.fn(),
    findByPaymentIntentId: vi.fn(),
    save: vi.fn(),
    saveForEvent: vi.fn(),
  } satisfies CoachingSubscriptions;
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

describe("ReadProgramStatusUseCase", () => {
  it("answers her submission with no later start when she started immediately", async () => {
    // arrange
    const subscriptions = createSubscriptions(
      subscriptionOf({ startChoice: "immediate" }),
    );
    const useCase = new ReadProgramStatusUseCase({
      clock: { now: () => NOW },
      journeys: createJourneys(journey(WELCOME_SEEN_AT, SUBMITTED_AT)),
      subscriptions,
    });

    // act
    const status = await useCase.execute("user_ana");

    // assert
    expect(status).toEqual({
      kind: "submitted",
      submittedAt: SUBMITTED_AT,
      workStartsOn: null,
      startNowUntil: null,
    });
    expect(subscriptions.findCurrentForClient).toHaveBeenCalledWith("client-1");
  });

  it("answers her submission with the day the work starts and until when she can start now when she waits out the withdrawal window", async () => {
    // arrange
    const useCase = new ReadProgramStatusUseCase({
      clock: { now: () => NOW },
      journeys: createJourneys(journey(WELCOME_SEEN_AT, SUBMITTED_AT)),
      subscriptions: createSubscriptions(
        subscriptionOf({ startChoice: "waiting" }),
      ),
    });

    // act
    const status = await useCase.execute("user_ana");

    // assert
    expect(status).toEqual({
      kind: "submitted",
      submittedAt: SUBMITTED_AT,
      workStartsOn: new Date("2026-10-10T10:00:00.000Z"),
      startNowUntil: new Date("2026-10-10T10:00:00.000Z"),
    });
  });

  it("answers neither a coming work start nor start now once her withdrawal deadline has passed on the waiting path", async () => {
    // arrange
    const useCase = new ReadProgramStatusUseCase({
      clock: { now: () => new Date("2026-10-10T10:00:00.000Z") },
      journeys: createJourneys(journey(WELCOME_SEEN_AT, SUBMITTED_AT)),
      subscriptions: createSubscriptions(
        subscriptionOf({ startChoice: "waiting" }),
      ),
    });

    // act
    const status = await useCase.execute("user_ana");

    // assert
    expect(status).toMatchObject({
      workStartsOn: null,
      startNowUntil: null,
    });
  });

  it("answers her submission with no start day when she holds no subscription", async () => {
    // arrange
    const useCase = new ReadProgramStatusUseCase({
      clock: { now: () => NOW },
      journeys: createJourneys(journey(WELCOME_SEEN_AT, SUBMITTED_AT)),
      subscriptions: createSubscriptions(null),
    });

    // act
    const status = await useCase.execute("user_ana");

    // assert
    expect(status).toEqual({
      kind: "submitted",
      submittedAt: SUBMITTED_AT,
      workStartsOn: null,
      startNowUntil: null,
    });
  });

  it.each([
    ["in-review", { reviewOpenedAt: OPENED_AT }],
    [
      "needs-details",
      { reviewOpenedAt: OPENED_AT, detailsRequestedAt: ASKED_AT },
    ],
    ["approved", { reviewOpenedAt: OPENED_AT, answersApprovedAt: NOW }],
  ] as const)(
    "answers %s once the coach's review reaches it",
    async (expected, reviewStamps) => {
      // arrange
      const useCase = new ReadProgramStatusUseCase({
        clock: { now: () => NOW },
        journeys: createJourneys(
          journey(WELCOME_SEEN_AT, SUBMITTED_AT, reviewStamps),
        ),
        subscriptions: createSubscriptions(null),
      });

      // act
      const status = await useCase.execute("user_ana");

      // assert
      expect(status).toMatchObject({
        kind: expected,
        submittedAt: SUBMITTED_AT,
      });
    },
  );

  it.each([
    ["a client who has not sent her onboarding", journey(WELCOME_SEEN_AT)],
    ["a subject bound to no client", null],
  ])("answers no status for %s", async (_label, found) => {
    // arrange
    const subscriptions = createSubscriptions(
      subscriptionOf({ startChoice: "waiting" }),
    );
    const useCase = new ReadProgramStatusUseCase({
      clock: { now: () => NOW },
      journeys: createJourneys(found),
      subscriptions,
    });

    // act
    const status = await useCase.execute("user_ana");

    // assert
    expect(status).toBeNull();
    expect(subscriptions.findCurrentForClient).not.toHaveBeenCalled();
  });
});

describe("ReadClientPortalStandingUseCase", () => {
  const ACCESS_END = new Date("2026-12-26T10:00:00.000Z");
  const ENDED_SUBSCRIPTION = subscriptionOf({
    startChoice: "waiting",
    status: "ended",
    cancelledAt: NOW,
    accessEndsAt: NOW,
  });

  function standingUseCase(options: {
    found: ClientJourney | null;
    subscription: CoachingSubscription | null;
    now: Date;
  }) {
    const subscriptions = createSubscriptions(options.subscription);

    return {
      subscriptions,
      useCase: new ReadClientPortalStandingUseCase({
        clock: { now: () => options.now },
        journeys: createJourneys(options.found),
        subscriptions,
      }),
    };
  }

  it("answers her portal reachable to a client who submitted onboarding and whose coaching is active", async () => {
    // arrange
    const found = journey(WELCOME_SEEN_AT, SUBMITTED_AT);
    const { useCase, subscriptions } = standingUseCase({
      found,
      subscription: subscriptionOf({ startChoice: "waiting" }),
      now: NOW,
    });

    // act
    const standing = await useCase.execute("user_ana");

    // assert
    expect(standing).toEqual({
      journey: found,
      coaching: "active",
      portal: "reachable",
    });
    expect(subscriptions.findCurrentForClient).toHaveBeenCalledWith("client-1");
  });

  it("keeps the portal reachable to a client the coach sent back for details", async () => {
    // arrange
    const found = journey(WELCOME_SEEN_AT, SUBMITTED_AT, {
      reviewOpenedAt: OPENED_AT,
      detailsRequestedAt: ASKED_AT,
    });
    const { useCase } = standingUseCase({
      found,
      subscription: subscriptionOf({ startChoice: "waiting" }),
      now: NOW,
    });

    // act
    const standing = await useCase.execute("user_ana");

    // assert
    expect(standing).toEqual({
      journey: found,
      coaching: "active",
      portal: "reachable",
    });
  });

  it.each([
    ["has not seen welcome", journey(null)],
    ["has not submitted onboarding", journey(WELCOME_SEEN_AT)],
  ])(
    "answers her portal awaiting onboarding to a client who %s, though her coaching is active",
    async (_label, found) => {
      // arrange
      const { useCase } = standingUseCase({
        found,
        subscription: subscriptionOf({ startChoice: "waiting" }),
        now: NOW,
      });

      // act
      const standing = await useCase.execute("user_ana");

      // assert
      expect(standing).toEqual({
        journey: found,
        coaching: "active",
        portal: "awaiting_onboarding",
      });
    },
  );

  it.each([
    ["ended", ENDED_SUBSCRIPTION, NOW],
    [
      "cancelled and past her access end",
      subscriptionOf({
        startChoice: "waiting",
        status: "cancelled",
        cancelledAt: NOW,
        accessEndsAt: ACCESS_END,
      }),
      ACCESS_END,
    ],
  ])(
    "answers her coaching and her portal ended to a submitted client whose subscription is %s",
    async (_label, subscription, now) => {
      // arrange
      const found = journey(WELCOME_SEEN_AT, SUBMITTED_AT);
      const { useCase } = standingUseCase({ found, subscription, now });

      // act
      const standing = await useCase.execute("user_ana");

      // assert
      expect(standing).toEqual({
        journey: found,
        coaching: "ended",
        portal: "ended",
      });
    },
  );

  it("answers her coaching ended to a client who never submitted onboarding", async () => {
    // arrange
    const found = journey(WELCOME_SEEN_AT);
    const { useCase } = standingUseCase({
      found,
      subscription: ENDED_SUBSCRIPTION,
      now: NOW,
    });

    // act
    const standing = await useCase.execute("user_ana");

    // assert
    expect(standing).toEqual({
      journey: found,
      coaching: "ended",
      portal: "ended",
    });
  });

  it("answers her portal reachable to a submitted client with no subscription", async () => {
    // arrange
    const found = journey(WELCOME_SEEN_AT, SUBMITTED_AT);
    const { useCase } = standingUseCase({
      found,
      subscription: null,
      now: NOW,
    });

    // act
    const standing = await useCase.execute("user_ana");

    // assert
    expect(standing).toEqual({
      journey: found,
      coaching: "active",
      portal: "reachable",
    });
  });

  it("answers no standing for a subject bound to no client", async () => {
    // arrange
    const { useCase, subscriptions } = standingUseCase({
      found: null,
      subscription: null,
      now: NOW,
    });

    // act
    const standing = await useCase.execute("user_ana");

    // assert
    expect(standing).toBeNull();
    expect(subscriptions.findCurrentForClient).not.toHaveBeenCalled();
  });
});
