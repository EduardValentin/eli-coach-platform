import { describe, expect, it } from "vitest";

import {
  readPaymentRefund,
  readSubscriptionChange,
} from "./payment-subscription-change.server";
import { STRIPE_VOCABULARY } from "./stripe/stripe-vocabulary.server";

const CREATED = 1790960433;
const OCCURRED_AT = new Date(CREATED * 1000);

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

describe("readSubscriptionChange", () => {
  it("reads a scheduled end with its purpose", () => {
    // act
    const read = readSubscriptionChange(
      {
        type: "customer.subscription.updated",
        created: CREATED,
        object: subscriptionObject({ cancel_at: 1798909229 }),
        previousAttributes: { cancel_at: null, canceled_at: null },
      },
      STRIPE_VOCABULARY,
    );

    // assert
    expect(read).toEqual({
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
    // act
    const read = readSubscriptionChange(
      {
        type: "customer.subscription.updated",
        created: CREATED,
        object: subscriptionObject(),
        previousAttributes: { cancel_at: 1798909229 },
      },
      STRIPE_VOCABULARY,
    );

    // assert
    expect(read?.change).toMatchObject({
      scheduledEndAt: null,
      scheduledEndChanged: true,
    });
  });

  it("reads an update that leaves the scheduled end alone as unchanged", () => {
    // act
    const read = readSubscriptionChange(
      {
        type: "customer.subscription.updated",
        created: CREATED,
        object: subscriptionObject(),
        previousAttributes: { pause_collection: null },
      },
      STRIPE_VOCABULARY,
    );

    // assert
    expect(read?.change).toMatchObject({
      scheduledEndChanged: false,
      previousStanding: null,
    });
  });

  it("reads the status the update moved away from", () => {
    // act
    const read = readSubscriptionChange(
      {
        type: "customer.subscription.updated",
        created: CREATED,
        object: subscriptionObject({ status: "past_due" }),
        previousAttributes: { status: "active" },
      },
      STRIPE_VOCABULARY,
    );

    // assert
    expect(read?.change).toMatchObject({
      standing: "payment-problem",
      previousStanding: "healthy",
    });
  });

  it("reads a deleted subscription with its end instant", () => {
    // act
    const read = readSubscriptionChange(
      {
        type: "customer.subscription.deleted",
        created: CREATED,
        object: subscriptionObject({
          status: "canceled",
          ended_at: 1790960471,
        }),
        previousAttributes: null,
      },
      STRIPE_VOCABULARY,
    );

    // assert
    expect(read?.change).toMatchObject({
      kind: "subscription_state",
      standing: "ended",
      endedAt: new Date(1790960471 * 1000),
    });
  });

  it("reads a subscription without a purpose as unrouted", () => {
    // act
    const read = readSubscriptionChange(
      {
        type: "customer.subscription.deleted",
        created: CREATED,
        object: subscriptionObject({ metadata: {} }),
        previousAttributes: null,
      },
      STRIPE_VOCABULARY,
    );

    // assert
    expect(read?.purpose).toBeNull();
  });

  it.each([
    ["invoice.paid", "paid"],
    ["invoice.payment_failed", "failed"],
  ] as const)(
    "reads %s through the subscription its parent names",
    (type, outcome) => {
      // act
      const read = readSubscriptionChange(
        {
          type,
          created: CREATED,
          object: invoiceObject(),
          previousAttributes: null,
        },
        STRIPE_VOCABULARY,
      );

      // assert
      expect(read).toEqual({
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
    // act
    const read = readSubscriptionChange(
      {
        type: "invoice.paid",
        created: CREATED,
        object: invoiceObject({ billing_reason: "subscription_create" }),
        previousAttributes: null,
      },
      STRIPE_VOCABULARY,
    );

    // assert
    expect(read?.change).toMatchObject({ invoiceReason: "purchase" });
  });

  it("reads nothing from an invoice that belongs to no subscription", () => {
    // act
    const read = readSubscriptionChange(
      {
        type: "invoice.paid",
        created: CREATED,
        object: invoiceObject({ parent: null }),
        previousAttributes: null,
      },
      STRIPE_VOCABULARY,
    );

    // assert
    expect(read).toBeNull();
  });

  it("reads nothing from an unlisted event type", () => {
    // act
    const read = readSubscriptionChange(
      {
        type: "customer.subscription.paused",
        created: CREATED,
        object: subscriptionObject(),
        previousAttributes: null,
      },
      STRIPE_VOCABULARY,
    );

    // assert
    expect(read).toBeNull();
  });
});

describe("readPaymentRefund", () => {
  it("reads the refunded total of a charge with its customer", () => {
    // act
    const refund = readPaymentRefund(
      {
        id: "ch_1",
        object: "charge",
        amount: 44700,
        amount_refunded: 10000,
        refunded: false,
        customer: "cus_1",
        currency: "eur",
      },
      CREATED,
    );

    // assert
    expect(refund).toEqual({
      kind: "charge_refund",
      customerId: "cus_1",
      chargeCents: 44700,
      refundedCents: 10000,
      currency: "eur",
      refundedAt: OCCURRED_AT,
    });
  });

  it("reads nothing from a charge without a customer", () => {
    // act
    const refund = readPaymentRefund(
      {
        id: "ch_1",
        object: "charge",
        amount: 44700,
        amount_refunded: 10000,
        customer: null,
        currency: "eur",
      },
      CREATED,
    );

    // assert
    expect(refund).toBeNull();
  });
});
