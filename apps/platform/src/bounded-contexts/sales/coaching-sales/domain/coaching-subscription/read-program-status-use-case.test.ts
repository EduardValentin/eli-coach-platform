import { describe, expect, it, vi } from "vitest";

import {
  ClientJourney,
  type ClientJourneySnapshot,
} from "~/bounded-contexts/clients/clients/domain/client-journey";

import {
  CoachingSubscription,
  withdrawalDeadline,
  type CoachingSubscriptionSnapshot,
  type StartChoice,
} from "./coaching-subscription";
import type { ClientLookupPort } from "./client-lookup-port";
import type { CoachingSubscriptionsPort } from "./coaching-subscriptions-port";
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
    standing: {
      status: "not-started",
      accessEndsAt: null,
      refundDue: false,
      bundleMonths: null,
      programStartsAt: null,
      paidThrough: null,
    },
    ...reviewStamps,
  });
}

function createJourneys(found: ClientJourney | null) {
  return {
    journeyOf: vi.fn().mockResolvedValue(
      found && {
        clientId: found.clientId,
        step: found.step(),
        onboardingSubmittedAt: found.onboardingSubmittedAt,
      },
    ),
  } satisfies Pick<ClientLookupPort, "journeyOf">;
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
    paidThrough: new Date("2026-12-26T10:00:00.000Z"),
    programStartsAt:
      overrides.startChoice === "waiting"
        ? withdrawalDeadline(PURCHASED_AT)
        : PURCHASED_AT,
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
  } satisfies Pick<CoachingSubscriptionsPort, "findCurrentForClient">;
}

describe("ReadProgramStatusUseCase", () => {
  it("answers her submission with no later start when she started immediately", async () => {
    // arrange
    const subscriptions = createSubscriptions(
      subscriptionOf({ startChoice: "immediate" }),
    );
    const readProgramStatusUseCase = new ReadProgramStatusUseCase({
      clockPort: { now: () => NOW },
      clientLookupPort: createJourneys(journey(WELCOME_SEEN_AT, SUBMITTED_AT)),
      coachingSubscriptionsPort: subscriptions,
    });

    // act
    const status = await readProgramStatusUseCase.execute("user_ana");

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
    const readProgramStatusUseCase = new ReadProgramStatusUseCase({
      clockPort: { now: () => NOW },
      clientLookupPort: createJourneys(journey(WELCOME_SEEN_AT, SUBMITTED_AT)),
      coachingSubscriptionsPort: createSubscriptions(
        subscriptionOf({ startChoice: "waiting" }),
      ),
    });

    // act
    const status = await readProgramStatusUseCase.execute("user_ana");

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
    const readProgramStatusUseCase = new ReadProgramStatusUseCase({
      clockPort: { now: () => new Date("2026-10-10T10:00:00.000Z") },
      clientLookupPort: createJourneys(journey(WELCOME_SEEN_AT, SUBMITTED_AT)),
      coachingSubscriptionsPort: createSubscriptions(
        subscriptionOf({ startChoice: "waiting" }),
      ),
    });

    // act
    const status = await readProgramStatusUseCase.execute("user_ana");

    // assert
    expect(status).toMatchObject({
      workStartsOn: null,
      startNowUntil: null,
    });
  });

  it("answers her submission with no start day when she holds no subscription", async () => {
    // arrange
    const readProgramStatusUseCase = new ReadProgramStatusUseCase({
      clockPort: { now: () => NOW },
      clientLookupPort: createJourneys(journey(WELCOME_SEEN_AT, SUBMITTED_AT)),
      coachingSubscriptionsPort: createSubscriptions(null),
    });

    // act
    const status = await readProgramStatusUseCase.execute("user_ana");

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
      const readProgramStatusUseCase = new ReadProgramStatusUseCase({
        clockPort: { now: () => NOW },
        clientLookupPort: createJourneys(
          journey(WELCOME_SEEN_AT, SUBMITTED_AT, reviewStamps),
        ),
        coachingSubscriptionsPort: createSubscriptions(null),
      });

      // act
      const status = await readProgramStatusUseCase.execute("user_ana");

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
    const readProgramStatusUseCase = new ReadProgramStatusUseCase({
      clockPort: { now: () => NOW },
      clientLookupPort: createJourneys(found),
      coachingSubscriptionsPort: subscriptions,
    });

    // act
    const status = await readProgramStatusUseCase.execute("user_ana");

    // assert
    expect(status).toBeNull();
    expect(subscriptions.findCurrentForClient).not.toHaveBeenCalled();
  });
});
