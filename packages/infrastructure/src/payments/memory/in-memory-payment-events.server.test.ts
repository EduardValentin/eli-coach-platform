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
        metadata: { purpose: "coaching-subscription" },
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
      session: {
        id: "cs_memory",
        customerId: "cus_memory",
        subscriptionId: "sub_memory",
        paymentIntentId: null,
        amountCents: 15900,
        currency: "eur",
        customerEmail: "sofia@example.com",
        paidAt: new Date(1790003600 * 1000),
        metadata: { purpose: "coaching-subscription" },
      },
    });
  });

  it("accepts a subscription deletion carrying the memory signature", async () => {
    // arrange
    const events = new InMemoryPaymentEvents();
    const body = JSON.stringify({
      id: "evt_memory_deleted",
      type: "customer.subscription.deleted",
      created: 1790003600,
      data: {
        object: {
          id: "sub_memory",
          customer: "cus_memory",
          status: "canceled",
          cancel_at: null,
          ended_at: 1790003600,
          metadata: { purpose: "coaching-subscription" },
        },
      },
    });

    // act
    const verdict = await events.verify(body, "memory");

    // assert
    expect(verdict).toMatchObject({
      kind: "subscription_changed",
      eventId: "evt_memory_deleted",
      purpose: "coaching-subscription",
      change: { subscriptionId: "sub_memory", providerStatus: "canceled" },
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
