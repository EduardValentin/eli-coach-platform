import { describe, expect, it } from "vitest";

import type { CheckoutCompletion } from "./coaching-subscription";
import { PurchasedSubscription } from "./purchased-subscription";

const completion: CheckoutCompletion = {
  checkoutSessionId: "cs_1",
  paymentCustomerId: "cus_1",
  paymentSubscriptionId: "sub_1",
  paymentIntentId: "pi_1",
  amountCents: 37500,
  currency: "eur",
  customerEmail: "ana@example.com",
  paidAt: new Date("2026-09-26T10:00:00.000Z"),
  assessmentCallId: "call-1",
  bundleId: "3-months",
  tier: "reduced",
  startChoice: "waiting",
};

describe("PurchasedSubscription.fromCompletedCheckout", () => {
  it("records the paid bundle as a subscription that has not started, with the payment intent of its first payment", () => {
    // act
    const purchased = PurchasedSubscription.fromCompletedCheckout(completion);

    // assert
    expect(purchased.toSnapshot()).toEqual({
      bundleId: "3-months",
      months: 3,
      tier: "reduced",
      amountCents: 37500,
      currency: "eur",
      paymentCustomerId: "cus_1",
      paymentSubscriptionId: "sub_1",
      paymentIntentId: "pi_1",
      checkoutSessionId: "cs_1",
      paidAt: completion.paidAt,
      paidThrough: new Date("2026-12-26T10:00:00.000Z"),
      startChoice: "waiting",
      programStartsAt: new Date("2026-10-10T10:00:00.000Z"),
      status: "not-started",
    });
  });

  it("starts an immediate program at payment", () => {
    // act
    const purchased = PurchasedSubscription.fromCompletedCheckout({
      ...completion,
      startChoice: "immediate",
    });

    // assert
    expect(purchased.toSnapshot().programStartsAt).toEqual(completion.paidAt);
  });

  it("pays through the last day of a shorter month", () => {
    // act
    const purchased = PurchasedSubscription.fromCompletedCheckout({
      ...completion,
      bundleId: "1-month",
      paidAt: new Date("2027-01-31T10:00:00.000Z"),
    });

    // assert
    expect(purchased.toSnapshot().paidThrough).toEqual(
      new Date("2027-02-28T10:00:00.000Z"),
    );
  });

  it("records a paid bundle whose payment intent is unknown without one", () => {
    // act
    const purchased = PurchasedSubscription.fromCompletedCheckout({
      ...completion,
      paymentIntentId: null,
    });

    // assert
    expect(purchased.toSnapshot().paymentIntentId).toBeNull();
  });

  it.each([
    ["1-month", 1],
    ["6-months", 6],
  ] as const)(
    "takes the months of the %s bundle from the catalog",
    (bundleId, months) => {
      // act
      const purchased = PurchasedSubscription.fromCompletedCheckout({
        ...completion,
        bundleId,
      });

      // assert
      expect(purchased.toSnapshot().months).toBe(months);
    },
  );
});

describe("PurchasedSubscription.standing", () => {
  it("starts the client's standing as not started with the bought bundle's months", () => {
    // arrange
    const purchased = PurchasedSubscription.fromCompletedCheckout(completion);

    // act
    const standing = purchased.standing();

    // assert
    expect(standing.toSnapshot()).toEqual({
      status: "not-started",
      accessEndsAt: null,
      refundDue: false,
      bundleMonths: 3,
      programStartsAt: new Date("2026-10-10T10:00:00.000Z"),
      paidThrough: new Date("2026-12-26T10:00:00.000Z"),
    });
  });
});

describe("PurchasedSubscription.renewalHoldUntil", () => {
  it("holds a waiting start's renewal until her program start", () => {
    // arrange
    const purchased = PurchasedSubscription.fromCompletedCheckout(completion);

    // act
    const holdUntil = purchased.renewalHoldUntil();

    // assert
    expect(holdUntil).toEqual(new Date("2026-10-10T10:00:00.000Z"));
  });

  it("holds no renewal for an immediate start", () => {
    // arrange
    const purchased = PurchasedSubscription.fromCompletedCheckout({
      ...completion,
      startChoice: "immediate",
    });

    // act
    const holdUntil = purchased.renewalHoldUntil();

    // assert
    expect(holdUntil).toBeNull();
  });
});
