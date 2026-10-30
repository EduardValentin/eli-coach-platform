import type { PaymentSubscriptionsPort } from "~/bounded-contexts/sales/coaching-sales/domain/coaching-subscription";
import { describe, expect, it } from "vitest";

import { InMemoryPaymentSubscriptionsAdapter } from "./in-memory-payment-subscriptions-adapter.server";

describe("InMemoryPaymentSubscriptionsAdapter", () => {
  it("accepts the hold, its lift and both kinds of end without a provider", async () => {
    // arrange
    const paymentSubscriptionsPort: PaymentSubscriptionsPort =
      new InMemoryPaymentSubscriptionsAdapter();

    // act
    const calls = Promise.all([
      paymentSubscriptionsPort.holdRenewal({
        paymentSubscriptionId: "sub_memory_1",
        until: new Date("2026-11-01T10:00:00.000Z"),
      }),
      paymentSubscriptionsPort.liftRenewalHold("sub_memory_1"),
      paymentSubscriptionsPort.endNow("sub_memory_1"),
      paymentSubscriptionsPort.endAt({
        paymentSubscriptionId: "sub_memory_1",
        at: new Date("2027-01-02T10:00:00.000Z"),
      }),
    ]);

    // assert
    await expect(calls).resolves.toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
  });

  it("sends her straight back to where she came from instead of a provider page", async () => {
    // arrange
    const inMemoryPaymentSubscriptionsAdapter =
      new InMemoryPaymentSubscriptionsAdapter();

    // act
    const session =
      await inMemoryPaymentSubscriptionsAdapter.openPaymentMethodSession({
        paymentCustomerId: "cus_memory_1",
        returnUrl: "http://localhost:3000/client/settings",
      });

    // assert
    expect(session).toEqual({ url: "http://localhost:3000/client/settings" });
  });
});
