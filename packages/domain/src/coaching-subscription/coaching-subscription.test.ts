import { describe, expect, it } from "vitest";

import {
  CoachingSubscription,
  START_CHOICES,
  withdrawalDeadline,
  type CheckoutCompletion,
} from "./coaching-subscription";

const completion: CheckoutCompletion = {
  checkoutSessionId: "cs_1",
  paymentCustomerId: "cus_1",
  paymentSubscriptionId: "sub_1",
  amountCents: 37500,
  currency: "eur",
  customerEmail: "ana@example.com",
  paidAt: new Date("2026-09-26T10:00:00.000Z"),
  assessmentCallId: "call-1",
  bundleId: "3-months",
  tier: "reduced",
  startChoice: "waiting",
};

describe("CoachingSubscription.fromCompletedCheckout", () => {
  it("records the paid bundle as a subscription that has not started", () => {
    // act
    const subscription = CoachingSubscription.fromCompletedCheckout(completion);

    // assert
    expect(subscription).toEqual({
      bundleId: "3-months",
      months: 3,
      tier: "reduced",
      amountCents: 37500,
      currency: "eur",
      paymentCustomerId: "cus_1",
      paymentSubscriptionId: "sub_1",
      checkoutSessionId: "cs_1",
      paidAt: completion.paidAt,
      startChoice: "waiting",
      status: "not-started",
    });
  });

  it.each([
    ["1-month", 1],
    ["6-months", 6],
  ] as const)(
    "takes the months of the %s bundle from the catalog",
    (bundleId, months) => {
      // act
      const subscription = CoachingSubscription.fromCompletedCheckout({
        ...completion,
        bundleId,
      });

      // assert
      expect(subscription.months).toBe(months);
    },
  );
});

describe("withdrawalDeadline", () => {
  it("falls 14 days after the purchase", () => {
    // act
    const deadline = withdrawalDeadline(new Date("2026-09-26T10:00:00.000Z"));

    // assert
    expect(deadline).toEqual(new Date("2026-10-10T10:00:00.000Z"));
  });
});

describe("START_CHOICES", () => {
  it("offers an immediate start or waiting out the withdrawal window", () => {
    // assert
    expect(START_CHOICES).toEqual(["immediate", "waiting"]);
  });
});
