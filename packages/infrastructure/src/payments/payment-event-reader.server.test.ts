import { describe, expect, it } from "vitest";

import {
  PaymentEventReader,
  readCardDetails,
  readPaidCheckoutSession,
} from "./payment-event-reader.server";
import { STRIPE_VOCABULARY } from "./stripe/stripe-vocabulary.server";

const CREATED = 1790960433;
const OCCURRED_AT = new Date(CREATED * 1000);
const PAID_AT_SECONDS = 1790003600;
const PAID_AT = new Date("2026-09-21T15:13:20.000Z");

const VISA_DETAILS = {
  paymentMethodId: "pm_visa",
  brand: "visa",
  lastFour: "4242",
  expiryMonth: 12,
  expiryYear: 2034,
};

function paidCheckoutSession(overrides: Record<string, unknown> = {}) {
  return {
    id: "cs_test_paid",
    object: "checkout.session",
    status: "complete",
    payment_status: "paid",
    customer: "cus_test",
    subscription: "sub_test",
    payment_intent: null,
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

function subscriptionObject(overrides: Record<string, unknown> = {}) {
  return {
    id: "sub_1",
    object: "subscription",
    customer: "cus_1",
    status: "active",
    cancel_at: null,
    ended_at: null,
    metadata: { purpose: "coaching-subscription" },
    ...overrides,
  };
}

function invoiceObject(overrides: Record<string, unknown> = {}) {
  return {
    id: "in_1",
    object: "invoice",
    customer: "cus_1",
    billing_reason: "subscription_cycle",
    parent: {
      type: "subscription_details",
      subscription_details: {
        subscription: "sub_1",
        metadata: { purpose: "coaching-subscription" },
      },
    },
    ...overrides,
  };
}

function chargeObject(overrides: Record<string, unknown> = {}) {
  return {
    id: "ch_1",
    object: "charge",
    amount: 44700,
    amount_refunded: 10000,
    refunded: false,
    customer: "cus_1",
    currency: "eur",
    payment_intent: "pi_1",
    ...overrides,
  };
}

function cardPaymentMethod(overrides: Record<string, unknown> = {}) {
  return {
    id: "pm_visa",
    object: "payment_method",
    type: "card",
    customer: "cus_test",
    card: {
      brand: "visa",
      last4: "4242",
      exp_month: 12,
      exp_year: 2034,
      funding: "credit",
    },
    ...overrides,
  };
}

function providerEvent(
  type: string,
  object: unknown,
  previousAttributes: Record<string, unknown> | null = null,
) {
  return {
    id: "evt_1",
    type,
    created: CREATED,
    data: { object, previous_attributes: previousAttributes },
  };
}

function read(event: unknown) {
  return new PaymentEventReader(STRIPE_VOCABULARY).read(event);
}

describe("PaymentEventReader", () => {
  describe("checkout events", () => {
    it("reads a completed and paid checkout event as paid when the event was created", () => {
      // arrange
      const event = {
        id: "evt_paid",
        type: "checkout.session.completed",
        created: 1790003600,
        data: { object: paidCheckoutSession() },
      };

      // act
      const verdict = read(event);

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
      const verdict = read(event);

      // assert
      expect(verdict).toEqual({ kind: "ignored" });
    });

    it("reads a paid checkout whatever its metadata, leaving routing to the caller", () => {
      // arrange
      const event = {
        id: "evt_foreign",
        type: "checkout.session.completed",
        created: 1790003600,
        data: {
          object: paidCheckoutSession({ metadata: { purpose: "gift" } }),
        },
      };

      // act
      const verdict = read(event);

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
      const verdict = read(event);

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
  });

  describe("subscription events", () => {
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
      const verdict = read(event);

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

    it("reads a scheduled end alongside other changed attributes", () => {
      // arrange
      const event = providerEvent(
        "customer.subscription.updated",
        subscriptionObject({ cancel_at: 1798909229 }),
        { cancel_at: null, canceled_at: null },
      );

      // act
      const verdict = read(event);

      // assert
      expect(verdict).toEqual({
        kind: "subscription_changed",
        eventId: "evt_1",
        purpose: "coaching-subscription",
        change: {
          kind: "subscription_state",
          subscriptionId: "sub_1",
          customerId: "cus_1",
          standing: "healthy",
          previousStanding: null,
          scheduledEndAt: new Date(1798909229 * 1000),
          scheduledEndChanged: true,
          endedAt: null,
          occurredAt: OCCURRED_AT,
        },
      });
    });

    it("reads a lifted end as a change of the scheduled end to nothing", () => {
      // arrange
      const event = providerEvent(
        "customer.subscription.updated",
        subscriptionObject(),
        { cancel_at: 1798909229 },
      );

      // act
      const verdict = read(event);

      // assert
      expect(verdict).toMatchObject({
        change: { scheduledEndAt: null, scheduledEndChanged: true },
      });
    });

    it("reads an update that leaves the scheduled end alone as unchanged", () => {
      // arrange
      const event = providerEvent(
        "customer.subscription.updated",
        subscriptionObject(),
        { pause_collection: null },
      );

      // act
      const verdict = read(event);

      // assert
      expect(verdict).toMatchObject({
        change: { scheduledEndChanged: false, previousStanding: null },
      });
    });

    it("reads the status the update moved away from", () => {
      // arrange
      const event = providerEvent(
        "customer.subscription.updated",
        subscriptionObject({ status: "past_due" }),
        { status: "active" },
      );

      // act
      const verdict = read(event);

      // assert
      expect(verdict).toMatchObject({
        change: { standing: "payment-problem", previousStanding: "healthy" },
      });
    });

    it("reads a deleted subscription with its end instant", () => {
      // arrange
      const event = providerEvent(
        "customer.subscription.deleted",
        subscriptionObject({ status: "canceled", ended_at: 1790960471 }),
      );

      // act
      const verdict = read(event);

      // assert
      expect(verdict).toMatchObject({
        change: {
          kind: "subscription_state",
          standing: "ended",
          endedAt: new Date(1790960471 * 1000),
        },
      });
    });

    it("reads a subscription without a purpose as unrouted", () => {
      // arrange
      const event = providerEvent(
        "customer.subscription.deleted",
        subscriptionObject({ metadata: {} }),
      );

      // act
      const verdict = read(event);

      // assert
      expect(verdict).toMatchObject({
        kind: "subscription_changed",
        purpose: null,
      });
    });

    it.each([
      ["invoice.paid", "paid"],
      ["invoice.payment_failed", "failed"],
    ] as const)(
      "reads %s through the subscription its parent names",
      (type, outcome) => {
        // arrange
        const event = providerEvent(type, invoiceObject());

        // act
        const verdict = read(event);

        // assert
        expect(verdict).toEqual({
          kind: "subscription_changed",
          eventId: "evt_1",
          purpose: "coaching-subscription",
          change: {
            kind: "invoice_outcome",
            subscriptionId: "sub_1",
            customerId: "cus_1",
            outcome,
            invoiceReason: "renewal",
            occurredAt: OCCURRED_AT,
          },
        });
      },
    );

    it("reads the purchase invoice as the purchase, in the provider's vocabulary", () => {
      // arrange
      const event = providerEvent(
        "invoice.paid",
        invoiceObject({ billing_reason: "subscription_create" }),
      );

      // act
      const verdict = read(event);

      // assert
      expect(verdict).toMatchObject({
        change: { invoiceReason: "purchase" },
      });
    });

    it("ignores an invoice that belongs to no subscription", () => {
      // arrange
      const event = providerEvent(
        "invoice.paid",
        invoiceObject({ parent: null }),
      );

      // act
      const verdict = read(event);

      // assert
      expect(verdict).toEqual({ kind: "ignored" });
    });

    it("ignores an unlisted subscription event type", () => {
      // arrange
      const event = providerEvent(
        "customer.subscription.paused",
        subscriptionObject(),
      );

      // act
      const verdict = read(event);

      // assert
      expect(verdict).toEqual({ kind: "ignored" });
    });

    it.each(["constructor", "__proto__", "toString"])(
      "ignores an event typed %s, a name every object inherits",
      (type) => {
        // arrange
        const event = providerEvent(type, invoiceObject());

        // act
        const verdict = read(event);

        // assert
        expect(verdict).toEqual({ kind: "ignored" });
      },
    );
  });

  describe("refund events", () => {
    it("reads a refunded charge with the payment intent it settled", () => {
      // arrange
      const event = {
        id: "evt_refunded",
        type: "charge.refunded",
        created: 1790960437,
        data: {
          object: chargeObject({
            id: "ch_test",
            amount_refunded: 44700,
            refunded: true,
            customer: "cus_test",
            metadata: {},
            payment_intent: "pi_test",
          }),
          previous_attributes: { amount_refunded: 10000 },
        },
      };

      // act
      const verdict = read(event);

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

    it("reads the refunded total of a partly refunded charge", () => {
      // arrange
      const event = providerEvent("charge.refunded", chargeObject());

      // act
      const verdict = read(event);

      // assert
      expect(verdict).toMatchObject({
        refund: {
          paymentIntentId: "pi_1",
          chargeCents: 44700,
          refundedCents: 10000,
          refundedAt: OCCURRED_AT,
        },
      });
    });

    it("reads the payment intent of a charge that carries it expanded", () => {
      // arrange
      const event = providerEvent(
        "charge.refunded",
        chargeObject({
          customer: null,
          payment_intent: { id: "pi_1", object: "payment_intent" },
        }),
      );

      // act
      const verdict = read(event);

      // assert
      expect(verdict).toMatchObject({ refund: { paymentIntentId: "pi_1" } });
    });

    it.each([
      ["a charge it cannot read", { id: "ch_test", object: "charge" }],
      [
        "a charge without a payment intent",
        chargeObject({ payment_intent: null }),
      ],
    ])("ignores %s", (_description, charge) => {
      // arrange
      const event = providerEvent("charge.refunded", charge);

      // act
      const verdict = read(event);

      // assert
      expect(verdict).toEqual({ kind: "ignored" });
    });
  });

  describe("payment method events", () => {
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
            card: {
              brand: "visa",
              last4: "4242",
              exp_month: 12,
              exp_year: 2034,
            },
          },
        },
      };

      // act
      const verdict = read(event);

      // assert
      expect(verdict).toEqual({
        kind: "payment_method_changed",
        eventId: "evt_card",
        change: { kind: "attached", customerId: "cus_test", ...VISA_DETAILS },
      });
    });

    it.each([
      ["payment_method.attached", "attached"],
      ["payment_method.automatically_updated", "updated"],
    ] as const)("reads %s as a card %s to its customer", (type, kind) => {
      // arrange
      const event = providerEvent(type, cardPaymentMethod());

      // act
      const verdict = read(event);

      // assert
      expect(verdict).toEqual({
        kind: "payment_method_changed",
        eventId: "evt_1",
        change: { kind, customerId: "cus_test", ...VISA_DETAILS },
      });
    });

    it("reads a detached card with the customer it was detached from", () => {
      // arrange
      const event = providerEvent(
        "payment_method.detached",
        cardPaymentMethod({ customer: null }),
        { customer: "cus_test" },
      );

      // act
      const verdict = read(event);

      // assert
      expect(verdict).toMatchObject({
        kind: "payment_method_changed",
        change: { kind: "detached", customerId: "cus_test", ...VISA_DETAILS },
      });
    });

    it("reads the customer of an expanded payment method", () => {
      // arrange
      const event = providerEvent(
        "payment_method.attached",
        cardPaymentMethod({ customer: { id: "cus_test" } }),
      );

      // act
      const verdict = read(event);

      // assert
      expect(verdict).toMatchObject({ change: { customerId: "cus_test" } });
    });

    it.each([
      [
        "a payment method that is not a card",
        cardPaymentMethod({ type: "sepa_debit", card: null }),
      ],
      ["a card without its details", cardPaymentMethod({ card: null })],
      [
        "a card with an unreadable last four",
        cardPaymentMethod({
          card: { brand: "visa", last4: "42", exp_month: 12, exp_year: 2034 },
        }),
      ],
      [
        "a card belonging to no customer",
        cardPaymentMethod({ customer: null }),
      ],
    ])("ignores %s", (_description, object) => {
      // arrange
      const event = providerEvent("payment_method.attached", object);

      // act
      const verdict = read(event);

      // assert
      expect(verdict).toEqual({ kind: "ignored" });
    });

    it("ignores a payment method event that is not a card change", () => {
      // arrange
      const event = providerEvent(
        "payment_method.updated",
        cardPaymentMethod(),
      );

      // act
      const verdict = read(event);

      // assert
      expect(verdict).toEqual({ kind: "ignored" });
    });
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
    const verdict = read(event);

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
    const verdict = read(event);

    // assert
    expect(verdict).toEqual({ kind: "invalid" });
  });
});

describe("readPaidCheckoutSession", () => {
  it("reads a complete and paid session paid at the given moment, keeping its metadata as sent", () => {
    // arrange
    const session = paidCheckoutSession({
      metadata: { purpose: "coaching-subscription", bundleId: "3-months" },
    });

    // act
    const paid = readPaidCheckoutSession(session, PAID_AT_SECONDS);

    // assert
    expect(paid).toEqual({
      id: "cs_test_paid",
      customerId: "cus_test",
      subscriptionId: "sub_test",
      paymentIntentId: null,
      amountCents: 44700,
      currency: "eur",
      customerEmail: "sofia@example.com",
      paidAt: PAID_AT,
      metadata: { purpose: "coaching-subscription", bundleId: "3-months" },
    });
  });

  it("reads the ids of an expanded customer, subscription and payment intent", () => {
    // arrange
    const session = paidCheckoutSession({
      customer: { id: "cus_expanded", object: "customer" },
      subscription: { id: "sub_expanded", object: "subscription" },
      payment_intent: { id: "pi_expanded", object: "payment_intent" },
    });

    // act
    const paid = readPaidCheckoutSession(session, PAID_AT_SECONDS);

    // assert
    expect(paid).toMatchObject({
      customerId: "cus_expanded",
      subscriptionId: "sub_expanded",
      paymentIntentId: "pi_expanded",
    });
  });

  it("reads the payment intent of the paid payment on a subscription-mode session's expanded invoice", () => {
    // arrange
    const session = paidCheckoutSession({
      invoice: {
        id: "in_test",
        object: "invoice",
        payments: {
          object: "list",
          data: [
            {
              object: "invoice_payment",
              status: "canceled",
              payment: { type: "payment_intent", payment_intent: "pi_failed" },
            },
            {
              object: "invoice_payment",
              status: "paid",
              payment: {
                type: "payment_intent",
                payment_intent: { id: "pi_paid", object: "payment_intent" },
              },
            },
          ],
        },
      },
    });

    // act
    const paid = readPaidCheckoutSession(session, PAID_AT_SECONDS);

    // assert
    expect(paid).toMatchObject({ paymentIntentId: "pi_paid" });
  });

  it("reads no payment intent from a subscription-mode session whose invoice is not expanded", () => {
    // arrange
    const session = paidCheckoutSession({ invoice: "in_test" });

    // act
    const paid = readPaidCheckoutSession(session, PAID_AT_SECONDS);

    // assert
    expect(paid).toMatchObject({ paymentIntentId: null });
  });

  it("reads a one-off payment without a subscription", () => {
    // arrange
    const session = paidCheckoutSession({
      subscription: null,
      payment_intent: "pi_test",
    });

    // act
    const paid = readPaidCheckoutSession(session, PAID_AT_SECONDS);

    // assert
    expect(paid).toMatchObject({
      subscriptionId: null,
      paymentIntentId: "pi_test",
    });
  });

  it("reads a guest payment without a customer", () => {
    // arrange
    const session = paidCheckoutSession({
      customer: null,
      subscription: null,
      payment_intent: "pi_test",
    });

    // act
    const paid = readPaidCheckoutSession(session, PAID_AT_SECONDS);

    // assert
    expect(paid).toMatchObject({
      customerId: null,
      subscriptionId: null,
      paymentIntentId: "pi_test",
    });
  });

  it("reads a session created outside the platform with empty metadata", () => {
    // arrange
    const session = paidCheckoutSession({ metadata: {} });

    // act
    const paid = readPaidCheckoutSession(session, PAID_AT_SECONDS);

    // assert
    expect(paid).toMatchObject({ metadata: {} });
  });

  it.each([
    ["an open session", { status: "open", payment_status: "unpaid" }],
    ["an expired session", { status: "expired", payment_status: "unpaid" }],
    ["a complete but unpaid session", { payment_status: "unpaid" }],
    ["a session without a total", { amount_total: null }],
    ["a session without a customer email", { customer_details: null }],
    ["a session without metadata", { metadata: null }],
  ])("reads nothing from %s", (_description, overrides) => {
    // arrange
    const session = paidCheckoutSession(overrides);

    // act
    const paid = readPaidCheckoutSession(session, PAID_AT_SECONDS);

    // assert
    expect(paid).toBeNull();
  });
});

describe("readCardDetails", () => {
  it("reads the brand, last four, expiry and id of a card payment method", () => {
    // arrange
    const paymentMethod = cardPaymentMethod({ customer: null });

    // act
    const details = readCardDetails(paymentMethod, STRIPE_VOCABULARY);

    // assert
    expect(details).toEqual(VISA_DETAILS);
  });

  it("reads nothing from a payment method that is not a card", () => {
    // arrange
    const paymentMethod = cardPaymentMethod({ type: "link", card: null });

    // act
    const details = readCardDetails(paymentMethod, STRIPE_VOCABULARY);

    // assert
    expect(details).toBeNull();
  });
});
