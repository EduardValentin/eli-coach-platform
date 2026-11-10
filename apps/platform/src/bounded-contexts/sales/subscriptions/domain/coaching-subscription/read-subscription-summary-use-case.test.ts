import { describe, expect, it, vi } from "vitest";

import {
  CoachingSubscription,
  withdrawalDeadline,
  type CoachingSubscriptionSnapshot,
} from "./coaching-subscription";
import type { CoachingSubscriptionsPort } from "./coaching-subscriptions-port";
import { ReadSubscriptionSummaryUseCase } from "./read-subscription-summary-use-case";
import { RefundDue } from "./refund-due";

const PAID_AT = new Date("2026-09-26T10:00:00.000Z");
const NOW = new Date("2026-10-20T10:00:00.000Z");
const clock = { now: () => NOW };

function subscriptionOf(
  overrides: Partial<CoachingSubscriptionSnapshot> = {},
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
    paidAt: PAID_AT,
    paidThrough: new Date("2026-12-26T10:00:00.000Z"),
    startChoice: "immediate",
    programStartsAt:
      overrides.startChoice === "waiting"
        ? withdrawalDeadline(PAID_AT)
        : PAID_AT,
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

describe("ReadSubscriptionSummaryUseCase", () => {
  it("reads the client's current subscription with its status now, no work start on the immediate path and no refund", async () => {
    // arrange
    const subscription = subscriptionOf();
    const subscriptions = createSubscriptions(subscription);
    const readSubscriptionSummaryUseCase = new ReadSubscriptionSummaryUseCase({
      clockPort: clock,
      coachingSubscriptionsPort: subscriptions,
    });

    // act
    const summary = await readSubscriptionSummaryUseCase.execute("client-1");

    // assert
    expect(summary).toEqual({
      subscription: subscription.toSnapshot(),
      status: "not-started",
      workStartsOn: null,
      refundOutstandingCents: null,
    });
    expect(subscriptions.findCurrentForClient).toHaveBeenCalledWith("client-1");
  });

  it("reads when the work starts for a client waiting out her withdrawal window", async () => {
    // arrange
    const readSubscriptionSummaryUseCase = new ReadSubscriptionSummaryUseCase({
      clockPort: clock,
      coachingSubscriptionsPort: createSubscriptions(
        subscriptionOf({ startChoice: "waiting" }),
      ),
    });

    // act
    const summary = await readSubscriptionSummaryUseCase.execute("client-1");

    // assert
    expect(summary?.workStartsOn).toEqual(new Date("2026-10-10T10:00:00.000Z"));
  });

  it("reads her subscription as ended once her cancelled access has run out", async () => {
    // arrange
    const readSubscriptionSummaryUseCase = new ReadSubscriptionSummaryUseCase({
      clockPort: clock,
      coachingSubscriptionsPort: createSubscriptions(
        subscriptionOf({
          status: "cancelled",
          cancelledAt: PAID_AT,
          accessEndsAt: NOW,
        }),
      ),
    });

    // act
    const summary = await readSubscriptionSummaryUseCase.execute("client-1");

    // assert
    expect(summary?.status).toBe("ended");
  });

  it("reads what is still owed of a part-settled refund", async () => {
    // arrange
    const cancelledAt = new Date("2026-10-05T10:00:00.000Z");
    const readSubscriptionSummaryUseCase = new ReadSubscriptionSummaryUseCase({
      clockPort: clock,
      coachingSubscriptionsPort: createSubscriptions(
        subscriptionOf({
          status: "ended",
          cancelledAt,
          accessEndsAt: cancelledAt,
          refund: RefundDue.full({ amountCents: 44700, cancelledAt })
            .settle({ refundedCents: 10000, at: NOW })
            .toSnapshot(),
        }),
      ),
    });

    // act
    const summary = await readSubscriptionSummaryUseCase.execute("client-1");

    // assert
    expect(summary?.refundOutstandingCents).toBe(34700);
  });

  it("reads nothing for a client with no subscription", async () => {
    // arrange
    const readSubscriptionSummaryUseCase = new ReadSubscriptionSummaryUseCase({
      clockPort: clock,
      coachingSubscriptionsPort: createSubscriptions(null),
    });

    // act
    const summary = await readSubscriptionSummaryUseCase.execute("client-1");

    // assert
    expect(summary).toBeNull();
  });
});
