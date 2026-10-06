import type { PaymentSubscriptions } from "@eli-coach-platform/domain/coaching-subscription";
import { describe, expect, it } from "vitest";

import { InMemoryPaymentSubscriptions } from "./in-memory-payment-subscriptions.server";

describe("InMemoryPaymentSubscriptions", () => {
  it("accepts the hold and both kinds of end without a provider", async () => {
    // arrange
    const subscriptions: PaymentSubscriptions =
      new InMemoryPaymentSubscriptions();

    // act
    const calls = Promise.all([
      subscriptions.holdRenewal("sub_memory_1"),
      subscriptions.endNow("sub_memory_1"),
      subscriptions.endAt({
        paymentSubscriptionId: "sub_memory_1",
        at: new Date("2027-01-02T10:00:00.000Z"),
      }),
    ]);

    // assert
    await expect(calls).resolves.toEqual([undefined, undefined, undefined]);
  });

  it("sends her straight back to where she came from instead of a provider page", async () => {
    // arrange
    const subscriptions = new InMemoryPaymentSubscriptions();

    // act
    const session = await subscriptions.openPaymentMethodSession({
      paymentCustomerId: "cus_memory_1",
      returnUrl: "http://localhost:3000/client/settings",
    });

    // assert
    expect(session).toEqual({ url: "http://localhost:3000/client/settings" });
  });
});
