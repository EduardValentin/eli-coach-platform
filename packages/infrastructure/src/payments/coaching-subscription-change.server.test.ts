import { describe, expect, it } from "vitest";

import { toSubscriptionEvent } from "./coaching-subscription-change.server";
import type {
  PaymentInvoiceOutcome,
  PaymentSubscriptionState,
} from "./payment-subscription-change.server";

const OCCURRED_AT = new Date("2026-10-20T10:00:00.000Z");
const SCHEDULED_END = new Date("2027-01-02T10:00:00.000Z");

function state(
  overrides: Partial<PaymentSubscriptionState> = {},
): PaymentSubscriptionState {
  return {
    kind: "subscription_state",
    subscriptionId: "sub_1",
    customerId: "cus_1",
    standing: "healthy",
    previousStanding: null,
    scheduledEndAt: null,
    scheduledEndChanged: false,
    endedAt: null,
    occurredAt: OCCURRED_AT,
    ...overrides,
  };
}

function invoice(
  overrides: Partial<PaymentInvoiceOutcome> = {},
): PaymentInvoiceOutcome {
  return {
    kind: "invoice_outcome",
    subscriptionId: "sub_1",
    customerId: "cus_1",
    outcome: "paid",
    billingReason: "subscription_cycle",
    occurredAt: OCCURRED_AT,
    ...overrides,
  };
}

describe("toSubscriptionEvent", () => {
  it("reads a deleted subscription as ended at its end instant", () => {
    // act
    const event = toSubscriptionEvent(
      state({ standing: "ended", endedAt: SCHEDULED_END }),
    );

    // assert
    expect(event).toEqual({
      kind: "ended",
      paymentSubscriptionId: "sub_1",
      endedAt: SCHEDULED_END,
    });
  });

  it("reads a newly scheduled end", () => {
    // act
    const event = toSubscriptionEvent(
      state({ scheduledEndAt: SCHEDULED_END, scheduledEndChanged: true }),
    );

    // assert
    expect(event).toEqual({
      kind: "end-scheduled",
      paymentSubscriptionId: "sub_1",
      endsAt: SCHEDULED_END,
      occurredAt: OCCURRED_AT,
    });
  });

  it("reads a cleared scheduled end as lifted", () => {
    // act
    const event = toSubscriptionEvent(state({ scheduledEndChanged: true }));

    // assert
    expect(event).toEqual({
      kind: "end-lifted",
      paymentSubscriptionId: "sub_1",
      occurredAt: OCCURRED_AT,
    });
  });

  it.each(["healthy", "other"] as const)(
    "reads a move from %s to a payment problem as a payment problem",
    (previousStanding) => {
      // act
      const event = toSubscriptionEvent(
        state({ standing: "payment-problem", previousStanding }),
      );

      // assert
      expect(event).toEqual({
        kind: "payment-problem",
        paymentSubscriptionId: "sub_1",
        occurredAt: OCCURRED_AT,
      });
    },
  );

  it("reads a move back to active as a recovered payment", () => {
    // act
    const event = toSubscriptionEvent(
      state({ previousStanding: "payment-problem" }),
    );

    // assert
    expect(event).toEqual({
      kind: "payment-recovered",
      paymentSubscriptionId: "sub_1",
      occurredAt: OCCURRED_AT,
    });
  });

  it("reads an update that changes neither the end nor the status as nothing", () => {
    // act
    const event = toSubscriptionEvent(state());

    // assert
    expect(event).toBeNull();
  });

  it("reads a failed invoice as a payment problem", () => {
    // act
    const event = toSubscriptionEvent(invoice({ outcome: "failed" }));

    // assert
    expect(event).toEqual({
      kind: "payment-problem",
      paymentSubscriptionId: "sub_1",
      occurredAt: OCCURRED_AT,
    });
  });

  it("reads a paid renewal", () => {
    // act
    const event = toSubscriptionEvent(invoice());

    // assert
    expect(event).toEqual({
      kind: "renewal-paid",
      paymentSubscriptionId: "sub_1",
      occurredAt: OCCURRED_AT,
    });
  });

  it("reads the paid purchase invoice as nothing, since the checkout records the purchase", () => {
    // act
    const event = toSubscriptionEvent(
      invoice({ billingReason: "subscription_create" }),
    );

    // assert
    expect(event).toBeNull();
  });

  it("reads a refunded charge as the customer's refunded total", () => {
    // act
    const event = toSubscriptionEvent({
      kind: "charge_refund",
      customerId: "cus_1",
      chargeCents: 44700,
      refundedCents: 10000,
      currency: "eur",
      refundedAt: OCCURRED_AT,
    });

    // assert
    expect(event).toEqual({
      kind: "charge-refunded",
      paymentCustomerId: "cus_1",
      refundedCents: 10000,
      occurredAt: OCCURRED_AT,
    });
  });
});
