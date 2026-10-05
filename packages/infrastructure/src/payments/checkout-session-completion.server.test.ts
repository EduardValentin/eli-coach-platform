import { describe, expect, it } from "vitest";

import { readPaidCheckoutSession } from "./checkout-session-completion.server";

const paidAt = new Date("2026-09-21T15:13:20.000Z");

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
    metadata: { purpose: "coaching-subscription", bundleId: "3-months" },
    ...overrides,
  };
}

describe("readPaidCheckoutSession", () => {
  it("reads a complete and paid session paid at the given moment, keeping its metadata as sent", () => {
    // arrange
    const session = paidCheckoutSession();

    // act
    const paid = readPaidCheckoutSession(session, paidAt);

    // assert
    expect(paid).toEqual({
      id: "cs_test_paid",
      customerId: "cus_test",
      subscriptionId: "sub_test",
      paymentIntentId: null,
      amountCents: 44700,
      currency: "eur",
      customerEmail: "sofia@example.com",
      paidAt,
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
    const paid = readPaidCheckoutSession(session, paidAt);

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
    const paid = readPaidCheckoutSession(session, paidAt);

    // assert
    expect(paid).toMatchObject({ paymentIntentId: "pi_paid" });
  });

  it("reads no payment intent from a subscription-mode session whose invoice is not expanded", () => {
    // arrange
    const session = paidCheckoutSession({ invoice: "in_test" });

    // act
    const paid = readPaidCheckoutSession(session, paidAt);

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
    const paid = readPaidCheckoutSession(session, paidAt);

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
    const paid = readPaidCheckoutSession(session, paidAt);

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
    const paid = readPaidCheckoutSession(session, paidAt);

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
    const paid = readPaidCheckoutSession(session, paidAt);

    // assert
    expect(paid).toBeNull();
  });
});
