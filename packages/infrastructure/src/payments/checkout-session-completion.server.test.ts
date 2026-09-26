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

describe("readPaidCheckoutSession", () => {
  it("reads a complete and paid session into a checkout completion paid at the given moment", () => {
    // arrange
    const session = paidCheckoutSession();

    // act
    const completion = readPaidCheckoutSession(session, paidAt);

    // assert
    expect(completion).toEqual({
      checkoutSessionId: "cs_test_paid",
      paymentCustomerId: "cus_test",
      paymentSubscriptionId: "sub_test",
      amountCents: 44700,
      currency: "eur",
      customerEmail: "sofia@example.com",
      paidAt,
      assessmentCallId: "5d7f0a52-7a55-4c38-9d8e-3f4d8c3b8f10",
      bundleId: "3-months",
      tier: "regular",
      startChoice: "waiting",
    });
  });

  it("reads the ids of an expanded customer and subscription", () => {
    // arrange
    const session = paidCheckoutSession({
      customer: { id: "cus_expanded", object: "customer" },
      subscription: { id: "sub_expanded", object: "subscription" },
    });

    // act
    const completion = readPaidCheckoutSession(session, paidAt);

    // assert
    expect(completion).toMatchObject({
      paymentCustomerId: "cus_expanded",
      paymentSubscriptionId: "sub_expanded",
    });
  });

  it.each([
    ["an open session", { status: "open", payment_status: "unpaid" }],
    ["an expired session", { status: "expired", payment_status: "unpaid" }],
    ["a complete but unpaid session", { payment_status: "unpaid" }],
    ["a session without a total", { amount_total: null }],
    ["a session without a customer email", { customer_details: null }],
    ["a session without a subscription", { subscription: null }],
  ])("reads nothing from %s", (_description, overrides) => {
    // arrange
    const session = paidCheckoutSession(overrides);

    // act
    const completion = readPaidCheckoutSession(session, paidAt);

    // assert
    expect(completion).toBeNull();
  });

  it.each([
    ["an unknown coaching bundle", { bundleId: "12-months" }],
    ["an unknown price tier", { tier: "discounted" }],
    ["an unknown start choice", { startChoice: "later" }],
    ["no assessment call", { assessmentCallId: undefined }],
  ])("reads nothing from metadata naming %s", (_description, metadata) => {
    // arrange
    const session = paidCheckoutSession({
      metadata: { ...paidCheckoutSession().metadata, ...metadata },
    });

    // act
    const completion = readPaidCheckoutSession(session, paidAt);

    // assert
    expect(completion).toBeNull();
  });

  it("reads nothing from a session created outside the platform", () => {
    // arrange
    const session = paidCheckoutSession({ metadata: {} });

    // act
    const completion = readPaidCheckoutSession(session, paidAt);

    // assert
    expect(completion).toBeNull();
  });
});
