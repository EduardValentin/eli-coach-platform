import { describe, expect, it } from "vitest";

import { InMemoryPaymentEvents } from "./in-memory-payment-events.server";

function paidCheckoutEvent(type = "checkout.session.completed") {
  return JSON.stringify({
    id: "evt_memory",
    type,
    created: 1790003600,
    data: {
      object: {
        id: "cs_memory",
        status: "complete",
        payment_status: "paid",
        customer: "cus_memory",
        subscription: "sub_memory",
        amount_total: 15900,
        currency: "eur",
        created: 1790000000,
        customer_details: { email: "sofia@example.com" },
        metadata: {
          assessmentCallId: "call-1",
          bundleId: "1-month",
          months: "1",
          tier: "regular",
          startChoice: "immediate",
        },
      },
    },
  });
}

describe("InMemoryPaymentEvents", () => {
  it("accepts a completed and paid checkout event carrying the memory signature", async () => {
    // arrange
    const events = new InMemoryPaymentEvents();

    // act
    const verdict = await events.verify(paidCheckoutEvent(), "memory");

    // assert
    expect(verdict).toEqual({
      kind: "checkout_completed",
      eventId: "evt_memory",
      completion: {
        checkoutSessionId: "cs_memory",
        paymentCustomerId: "cus_memory",
        paymentSubscriptionId: "sub_memory",
        amountCents: 15900,
        currency: "eur",
        customerEmail: "sofia@example.com",
        paidAt: new Date(1790003600 * 1000),
        assessmentCallId: "call-1",
        bundleId: "1-month",
        tier: "regular",
        startChoice: "immediate",
      },
    });
  });

  it("ignores another event type", async () => {
    // arrange
    const events = new InMemoryPaymentEvents();

    // act
    const verdict = await events.verify(
      paidCheckoutEvent("customer.created"),
      "memory",
    );

    // assert
    expect(verdict).toEqual({ kind: "ignored" });
  });

  it.each([
    ["no signature", null],
    ["another signature", "t=1,v1=abc"],
  ])("refuses an event with %s", async (_description, signature) => {
    // arrange
    const events = new InMemoryPaymentEvents();

    // act
    const verdict = await events.verify(paidCheckoutEvent(), signature);

    // assert
    expect(verdict).toEqual({ kind: "invalid" });
  });

  it("refuses a body that is not JSON", async () => {
    // arrange
    const events = new InMemoryPaymentEvents();

    // act
    const verdict = await events.verify("not json", "memory");

    // assert
    expect(verdict).toEqual({ kind: "invalid" });
  });
});
