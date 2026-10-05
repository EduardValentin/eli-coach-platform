import { describe, expect, it } from "vitest";

import { readPaymentEvent } from "./payment-event-verdict.server";
import { STRIPE_VOCABULARY } from "./stripe/stripe-vocabulary.server";

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
      purpose: "coaching-subscription",
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
    const verdict = readPaymentEvent(event, STRIPE_VOCABULARY);

    // assert
    expect(verdict).toEqual({
      kind: "checkout_completed",
      eventId: "evt_paid",
      session: {
        id: "cs_test_paid",
        customerId: "cus_test",
        subscriptionId: "sub_test",
        paymentIntentId: null,
        amountCents: 44700,
        currency: "eur",
        customerEmail: "sofia@example.com",
        paidAt: new Date(1790003600 * 1000),
        metadata: paidCheckoutSession().metadata,
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
    const verdict = readPaymentEvent(event, STRIPE_VOCABULARY);

    // assert
    expect(verdict).toEqual({ kind: "ignored" });
  });

  it("reads a paid checkout whatever its metadata, leaving routing to the caller", () => {
    // arrange
    const event = {
      id: "evt_foreign",
      type: "checkout.session.completed",
      created: 1790003600,
      data: { object: paidCheckoutSession({ metadata: { purpose: "gift" } }) },
    };

    // act
    const verdict = readPaymentEvent(event, STRIPE_VOCABULARY);

    // assert
    expect(verdict).toMatchObject({
      kind: "checkout_completed",
      eventId: "evt_foreign",
      session: { metadata: { purpose: "gift" } },
    });
  });

  it("reads a paid session without a customer so it can be routed by purpose", () => {
    // arrange
    const event = {
      id: "evt_guest",
      type: "checkout.session.completed",
      created: 1790003600,
      data: {
        object: paidCheckoutSession({
          customer: null,
          subscription: null,
          payment_intent: "pi_guest",
          metadata: { purpose: "store-order" },
        }),
      },
    };

    // act
    const verdict = readPaymentEvent(event, STRIPE_VOCABULARY);

    // assert
    expect(verdict).toMatchObject({
      kind: "checkout_completed",
      eventId: "evt_guest",
      session: {
        customerId: null,
        paymentIntentId: "pi_guest",
        metadata: { purpose: "store-order" },
      },
    });
  });

  it("reads a subscription update with its purpose and the attributes it changed", () => {
    // arrange
    const event = {
      id: "evt_scheduled",
      type: "customer.subscription.updated",
      created: 1790960433,
      data: {
        object: {
          id: "sub_test",
          object: "subscription",
          customer: "cus_test",
          status: "active",
          cancel_at: 1798909229,
          ended_at: null,
          metadata: { purpose: "coaching-subscription" },
        },
        previous_attributes: { cancel_at: null },
      },
    };

    // act
    const verdict = readPaymentEvent(event, STRIPE_VOCABULARY);

    // assert
    expect(verdict).toEqual({
      kind: "subscription_changed",
      eventId: "evt_scheduled",
      purpose: "coaching-subscription",
      change: {
        kind: "subscription_state",
        subscriptionId: "sub_test",
        customerId: "cus_test",
        standing: "healthy",
        previousStanding: null,
        scheduledEndAt: new Date(1798909229 * 1000),
        scheduledEndChanged: true,
        endedAt: null,
        occurredAt: new Date(1790960433 * 1000),
      },
    });
  });

  it("reads a failed invoice as a subscription change", () => {
    // arrange
    const event = {
      id: "evt_failed",
      type: "invoice.payment_failed",
      created: 1790960433,
      data: {
        object: {
          id: "in_test",
          object: "invoice",
          customer: "cus_test",
          billing_reason: "subscription_cycle",
          parent: {
            type: "subscription_details",
            subscription_details: {
              subscription: "sub_test",
              metadata: { purpose: "coaching-subscription" },
            },
          },
        },
      },
    };

    // act
    const verdict = readPaymentEvent(event, STRIPE_VOCABULARY);

    // assert
    expect(verdict).toMatchObject({
      kind: "subscription_changed",
      eventId: "evt_failed",
      purpose: "coaching-subscription",
      change: { kind: "invoice_outcome", outcome: "failed" },
    });
  });

  it("reads a refunded charge with the payment intent it settled", () => {
    // arrange
    const event = {
      id: "evt_refunded",
      type: "charge.refunded",
      created: 1790960437,
      data: {
        object: {
          id: "ch_test",
          object: "charge",
          amount: 44700,
          amount_refunded: 44700,
          refunded: true,
          customer: "cus_test",
          currency: "eur",
          metadata: {},
          payment_intent: "pi_test",
        },
        previous_attributes: { amount_refunded: 10000 },
      },
    };

    // act
    const verdict = readPaymentEvent(event, STRIPE_VOCABULARY);

    // assert
    expect(verdict).toEqual({
      kind: "charge_refunded",
      eventId: "evt_refunded",
      refund: {
        kind: "charge_refund",
        paymentIntentId: "pi_test",
        chargeCents: 44700,
        refundedCents: 44700,
        currency: "eur",
        refundedAt: new Date(1790960437 * 1000),
      },
    });
  });

  it("ignores a refunded charge it cannot read", () => {
    // arrange
    const event = {
      id: "evt_refunded",
      type: "charge.refunded",
      created: 1790960437,
      data: { object: { id: "ch_test", object: "charge" } },
    };

    // act
    const verdict = readPaymentEvent(event, STRIPE_VOCABULARY);

    // assert
    expect(verdict).toEqual({ kind: "ignored" });
  });

  it("reads a card attached to a customer as a payment method change", () => {
    // arrange
    const event = {
      id: "evt_card",
      type: "payment_method.attached",
      created: 1790960437,
      data: {
        object: {
          id: "pm_visa",
          object: "payment_method",
          type: "card",
          customer: "cus_test",
          card: { brand: "visa", last4: "4242", exp_month: 12, exp_year: 2034 },
        },
      },
    };

    // act
    const verdict = readPaymentEvent(event, STRIPE_VOCABULARY);

    // assert
    expect(verdict).toEqual({
      kind: "payment_method_changed",
      eventId: "evt_card",
      change: {
        kind: "attached",
        customerId: "cus_test",
        paymentMethodId: "pm_visa",
        brand: "visa",
        lastFour: "4242",
        expiryMonth: 12,
        expiryYear: 2034,
      },
    });
  });

  it("ignores a payment method change that is not a card", () => {
    // arrange
    const event = {
      id: "evt_debit",
      type: "payment_method.attached",
      created: 1790960437,
      data: {
        object: {
          id: "pm_debit",
          object: "payment_method",
          type: "sepa_debit",
          customer: "cus_test",
        },
      },
    };

    // act
    const verdict = readPaymentEvent(event, STRIPE_VOCABULARY);

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
    const verdict = readPaymentEvent(event, STRIPE_VOCABULARY);

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
    const verdict = readPaymentEvent(event, STRIPE_VOCABULARY);

    // assert
    expect(verdict).toEqual({ kind: "invalid" });
  });
});
