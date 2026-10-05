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
      const purchased = PurchasedSubscription.fromCompletedCheckout({
        ...completion,
        bundleId,
      });

      // assert
      expect(purchased.toSnapshot().months).toBe(months);
    },
  );
});
