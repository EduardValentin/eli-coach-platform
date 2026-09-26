import { describe, expect, it } from "vitest";

import { readPaymentEvent } from "./payment-event-verdict.server";

function paidCheckoutSession(overrides: Record<string, unknown> = {}) {
  return {
    id: "cs_test_paid",
    object: "checkout.session",
    status: "complete",
    payment_status: "paid",
    customer: "cus_test",
    subscription: "sub_test",
    amount_total: 44700,
    currency: "eur",
    created: 1790000000,
    customer_details: { email: "sofia@example.com" },
    metadata: {
      assessmentCallId: "5d7f0a52-7a55-4c38-9d8e-3f4d8c3b8f10",
      bundleId: "3-months",
      months: "3",
      tier: "regular",
      startChoice: "waiting",
    },
    ...overrides,
  };
}

describe("readPaymentEvent", () => {
  it("reads a completed and paid checkout event as paid when the event was created", () => {
    // arrange
    const event = {
      id: "evt_paid",
      type: "checkout.session.completed",
      created: 1790003600,
      data: { object: paidCheckoutSession() },
    };

    // act
    const verdict = readPaymentEvent(event);

    // assert
    expect(verdict).toEqual({
      kind: "checkout_completed",
      eventId: "evt_paid",
      completion: {
        checkoutSessionId: "cs_test_paid",
        paymentCustomerId: "cus_test",
        paymentSubscriptionId: "sub_test",
        amountCents: 44700,
        currency: "eur",
        customerEmail: "sofia@example.com",
        paidAt: new Date(1790003600 * 1000),
        assessmentCallId: "5d7f0a52-7a55-4c38-9d8e-3f4d8c3b8f10",
        bundleId: "3-months",
        tier: "regular",
        startChoice: "waiting",
      },
    });
  });

  it("ignores a completed checkout that is not paid", () => {
    // arrange
    const event = {
      id: "evt_unpaid",
      type: "checkout.session.completed",
      created: 1790003600,
      data: { object: paidCheckoutSession({ payment_status: "unpaid" }) },
    };

    // act
    const verdict = readPaymentEvent(event);

    // assert
    expect(verdict).toEqual({ kind: "ignored" });
  });

  it("ignores every other event type", () => {
    // arrange
    const event = {
      id: "evt_expired",
      type: "checkout.session.expired",
      created: 1790003600,
      data: { object: paidCheckoutSession({ status: "expired" }) },
    };

    // act
    const verdict = readPaymentEvent(event);

    // assert
    expect(verdict).toEqual({ kind: "ignored" });
  });

  it.each([
    ["no event", undefined],
    [
      "an event without an id",
      { type: "checkout.session.completed", created: 1790003600, data: {} },
    ],
    [
      "an event without data",
      { id: "evt_1", type: "checkout.session.completed", created: 1790003600 },
    ],
    [
      "an event without a creation time",
      {
        id: "evt_1",
        type: "checkout.session.completed",
        data: { object: paidCheckoutSession() },
      },
    ],
  ])("answers invalid for %s", (_description, event) => {
    // arrange
    // act
    const verdict = readPaymentEvent(event);

    // assert
    expect(verdict).toEqual({ kind: "invalid" });
  });
});
