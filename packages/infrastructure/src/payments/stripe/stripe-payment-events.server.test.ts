import Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";

import { StripePaymentEvents } from "./stripe-payment-events.server";

const signingSecret = "whsec_unit_signing_secret";

function paidCheckoutEvent(metadataOverrides: Record<string, unknown> = {}) {
  return {
    id: "evt_paid",
    object: "event",
    type: "checkout.session.completed",
    created: 1790003600,
    data: {
      object: {
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
          startChoice: "immediate",
          ...metadataOverrides,
        },
      },
    },
  };
}

function sign(payload: string, secret: string) {
  return Stripe.webhooks.generateTestHeaderString({ payload, secret });
}

describe("StripePaymentEvents", () => {
  it("verifies a signed completed and paid checkout event as paid when the event was created", async () => {
    // arrange
    const events = new StripePaymentEvents({
      webhooks: Stripe.webhooks,
      signingSecret,
    });
    const rawBody = JSON.stringify(paidCheckoutEvent());

    // act
    const verdict = await events.verify(rawBody, sign(rawBody, signingSecret));

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
        startChoice: "immediate",
      },
    });
  });

  it("ignores a signed event of another type", async () => {
    // arrange
    const events = new StripePaymentEvents({
      webhooks: Stripe.webhooks,
      signingSecret,
    });
    const rawBody = JSON.stringify({
      ...paidCheckoutEvent(),
      type: "invoice.paid",
    });

    // act
    const verdict = await events.verify(rawBody, sign(rawBody, signingSecret));

    // assert
    expect(verdict).toEqual({ kind: "ignored" });
  });

  it("ignores a signed paid checkout the platform did not create", async () => {
    // arrange
    const events = new StripePaymentEvents({
      webhooks: Stripe.webhooks,
      signingSecret,
    });
    const rawBody = JSON.stringify(paidCheckoutEvent({ bundleId: "gift" }));

    // act
    const verdict = await events.verify(rawBody, sign(rawBody, signingSecret));

    // assert
    expect(verdict).toEqual({ kind: "ignored" });
  });

  it("refuses an event signed with another secret", async () => {
    // arrange
    const events = new StripePaymentEvents({
      webhooks: Stripe.webhooks,
      signingSecret,
    });
    const rawBody = JSON.stringify(paidCheckoutEvent());

    // act
    const verdict = await events.verify(
      rawBody,
      sign(rawBody, "whsec_another_account"),
    );

    // assert
    expect(verdict).toEqual({ kind: "invalid" });
  });

  it("refuses a body changed after it was signed", async () => {
    // arrange
    const events = new StripePaymentEvents({
      webhooks: Stripe.webhooks,
      signingSecret,
    });
    const signedBody = JSON.stringify(paidCheckoutEvent());
    const tamperedBody = JSON.stringify(paidCheckoutEvent({ tier: "reduced" }));

    // act
    const verdict = await events.verify(
      tamperedBody,
      sign(signedBody, signingSecret),
    );

    // assert
    expect(verdict).toEqual({ kind: "invalid" });
  });

  it.each([
    ["no signature", null],
    ["a malformed signature", "not-a-stripe-signature"],
  ])("refuses an event with %s", async (_description, signature) => {
    // arrange
    const events = new StripePaymentEvents({
      webhooks: Stripe.webhooks,
      signingSecret,
    });
    const rawBody = JSON.stringify(paidCheckoutEvent());

    // act
    const verdict = await events.verify(rawBody, signature);

    // assert
    expect(verdict).toEqual({ kind: "invalid" });
  });

  it("refuses a signed body that is not JSON", async () => {
    // arrange
    const events = new StripePaymentEvents({
      webhooks: Stripe.webhooks,
      signingSecret,
    });
    const rawBody = "not json";

    // act
    const verdict = await events.verify(rawBody, sign(rawBody, signingSecret));

    // assert
    expect(verdict).toEqual({ kind: "invalid" });
  });

  it("rethrows a failure that is not a verification refusal", async () => {
    // arrange
    const failure = new Error("crypto provider unavailable");
    const events = new StripePaymentEvents({
      webhooks: {
        constructEvent: vi.fn(() => {
          throw failure;
        }),
      },
      signingSecret,
    });

    // act
    const verifying = events.verify("{}", "t=1,v1=abc");

    // assert
    await expect(verifying).rejects.toBe(failure);
  });
});
