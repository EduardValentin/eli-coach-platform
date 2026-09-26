import type { CreateCheckoutSessionCommand } from "@eli-coach-platform/domain/coaching-subscription";
import Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";

import { StripePaymentCheckout } from "./stripe-payment-checkout.server";

const command: CreateCheckoutSessionCommand = {
  customerId: "cus_test",
  bundle: {
    id: "3-months",
    title: "3 Months",
    months: 3,
    amountCents: 37500,
  },
  currency: "eur",
  metadata: {
    assessmentCallId: "5d7f0a52-7a55-4c38-9d8e-3f4d8c3b8f10",
    bundleId: "3-months",
    tier: "reduced",
    startChoice: "immediate",
  },
  successUrl:
    "https://evoa.fit/checkout/complete?session={CHECKOUT_SESSION_ID}",
  cancelUrl: "https://evoa.fit/select-bundle?token=abc&payment=cancelled",
};

function paidSession() {
  return {
    id: "cs_test_paid",
    status: "complete",
    payment_status: "paid",
    customer: "cus_test",
    subscription: {
      id: "sub_test",
      object: "subscription",
      created: 1790003590,
    },
    amount_total: 37500,
    currency: "eur",
    created: 1790000000,
    customer_details: { email: "sofia@example.com" },
    metadata: {
      assessmentCallId: "5d7f0a52-7a55-4c38-9d8e-3f4d8c3b8f10",
      bundleId: "3-months",
      months: "3",
      tier: "reduced",
      startChoice: "immediate",
    },
  };
}

function invalidRequest(code?: string) {
  return new Stripe.errors.StripeInvalidRequestError({
    type: "invalid_request_error",
    message: "The request was refused.",
    ...(code ? { code } : {}),
  });
}

function createStubClient() {
  return {
    customers: { create: vi.fn() },
    checkout: {
      sessions: { create: vi.fn(), expire: vi.fn(), retrieve: vi.fn() },
    },
  };
}

describe("StripePaymentCheckout", () => {
  it("creates one customer per assessment call with an idempotency key", async () => {
    // arrange
    const client = createStubClient();
    client.customers.create.mockResolvedValue({ id: "cus_created" });
    const checkout = new StripePaymentCheckout(client);

    // act
    const customer = await checkout.createCustomer({
      email: "sofia@example.com",
      assessmentCallId: "call-1",
    });

    // assert
    expect(client.customers.create).toHaveBeenCalledWith(
      { email: "sofia@example.com", metadata: { assessmentCallId: "call-1" } },
      { idempotencyKey: "assessment-call:call-1:customer" },
    );
    expect(customer).toEqual({ id: "cus_created" });
  });

  it("creates a card-only monthly subscription session for the bundle total", async () => {
    // arrange
    const client = createStubClient();
    client.checkout.sessions.create.mockResolvedValue({
      id: "cs_test_created",
      url: "https://checkout.stripe.com/c/pay/cs_test_created",
    });
    const checkout = new StripePaymentCheckout(client);

    // act
    const session = await checkout.createSession(command);

    // assert
    const metadata = {
      assessmentCallId: "5d7f0a52-7a55-4c38-9d8e-3f4d8c3b8f10",
      bundleId: "3-months",
      months: "3",
      tier: "reduced",
      startChoice: "immediate",
    };
    expect(client.checkout.sessions.create).toHaveBeenCalledWith({
      mode: "subscription",
      customer: "cus_test",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: 37500,
            product_data: { name: "3 Months" },
            recurring: { interval: "month", interval_count: 3 },
          },
        },
      ],
      metadata,
      subscription_data: { metadata },
      success_url:
        "https://evoa.fit/checkout/complete?session={CHECKOUT_SESSION_ID}",
      cancel_url: "https://evoa.fit/select-bundle?token=abc&payment=cancelled",
    });
    expect(session).toEqual({
      id: "cs_test_created",
      url: "https://checkout.stripe.com/c/pay/cs_test_created",
    });
  });

  it("fails a created session that has no hosted page to redirect to", async () => {
    // arrange
    const client = createStubClient();
    client.checkout.sessions.create.mockResolvedValue({
      id: "cs_test_created",
      url: null,
    });
    const checkout = new StripePaymentCheckout(client);

    // act
    const creating = checkout.createSession(command);

    // assert
    await expect(creating).rejects.toThrow("cs_test_created");
  });

  it("expires an open session", async () => {
    // arrange
    const client = createStubClient();
    client.checkout.sessions.expire.mockResolvedValue({ status: "expired" });
    const checkout = new StripePaymentCheckout(client);

    // act
    await checkout.expireSession("cs_test_open");

    // assert
    expect(client.checkout.sessions.expire).toHaveBeenCalledWith(
      "cs_test_open",
    );
  });

  it.each(["expired", "complete"])(
    "treats a refused expiry of an already %s session as done",
    async (status) => {
      // arrange
      const client = createStubClient();
      client.checkout.sessions.expire.mockRejectedValue(invalidRequest());
      client.checkout.sessions.retrieve.mockResolvedValue({ status });
      const checkout = new StripePaymentCheckout(client);

      // act
      const expiring = checkout.expireSession("cs_test_closed");

      // assert
      await expect(expiring).resolves.toBeUndefined();
      expect(client.checkout.sessions.retrieve).toHaveBeenCalledWith(
        "cs_test_closed",
      );
    },
  );

  it("rethrows a refused expiry of a session that is still open", async () => {
    // arrange
    const client = createStubClient();
    const refusal = invalidRequest();
    client.checkout.sessions.expire.mockRejectedValue(refusal);
    client.checkout.sessions.retrieve.mockResolvedValue({ status: "open" });
    const checkout = new StripePaymentCheckout(client);

    // act
    const expiring = checkout.expireSession("cs_test_open");

    // assert
    await expect(expiring).rejects.toBe(refusal);
  });

  it.each([
    [
      "a connection failure",
      new Stripe.errors.StripeConnectionError({ message: "socket hang up" }),
    ],
    [
      "an authentication failure",
      new Stripe.errors.StripeAuthenticationError({ message: "bad key" }),
    ],
    ["an unexpected error", new Error("boom")],
  ])("rethrows %s while expiring", async (_description, failure) => {
    // arrange
    const client = createStubClient();
    client.checkout.sessions.expire.mockRejectedValue(failure);
    const checkout = new StripePaymentCheckout(client);

    // act
    const expiring = checkout.expireSession("cs_test_open");

    // assert
    await expect(expiring).rejects.toBe(failure);
    expect(client.checkout.sessions.retrieve).not.toHaveBeenCalled();
  });

  it("finds a complete and paid session as a checkout completion paid when its subscription was created", async () => {
    // arrange
    const client = createStubClient();
    client.checkout.sessions.retrieve.mockResolvedValue(paidSession());
    const checkout = new StripePaymentCheckout(client);

    // act
    const completion = await checkout.findCompletedSession("cs_test_paid");

    // assert
    expect(client.checkout.sessions.retrieve).toHaveBeenCalledWith(
      "cs_test_paid",
      { expand: ["subscription"] },
    );
    expect(completion).toEqual({
      checkoutSessionId: "cs_test_paid",
      paymentCustomerId: "cus_test",
      paymentSubscriptionId: "sub_test",
      amountCents: 37500,
      currency: "eur",
      customerEmail: "sofia@example.com",
      paidAt: new Date(1790003590 * 1000),
      assessmentCallId: "5d7f0a52-7a55-4c38-9d8e-3f4d8c3b8f10",
      bundleId: "3-months",
      tier: "reduced",
      startChoice: "immediate",
    });
  });

  it("finds nothing for a session that is not paid", async () => {
    // arrange
    const client = createStubClient();
    client.checkout.sessions.retrieve.mockResolvedValue({
      ...paidSession(),
      status: "open",
      payment_status: "unpaid",
    });
    const checkout = new StripePaymentCheckout(client);

    // act
    const completion = await checkout.findCompletedSession("cs_test_open");

    // assert
    expect(completion).toBeNull();
  });

  it.each([
    ["a subscription that was not expanded", "sub_test"],
    ["no subscription", null],
  ])(
    "finds nothing for a paid session with %s",
    async (_description, subscription) => {
      // arrange
      const client = createStubClient();
      client.checkout.sessions.retrieve.mockResolvedValue({
        ...paidSession(),
        subscription,
      });
      const checkout = new StripePaymentCheckout(client);

      // act
      const completion = await checkout.findCompletedSession("cs_test_paid");

      // assert
      expect(completion).toBeNull();
    },
  );

  it("finds nothing for a session Stripe does not know", async () => {
    // arrange
    const client = createStubClient();
    client.checkout.sessions.retrieve.mockRejectedValue(
      invalidRequest("resource_missing"),
    );
    const checkout = new StripePaymentCheckout(client);

    // act
    const completion = await checkout.findCompletedSession("cs_test_unknown");

    // assert
    expect(completion).toBeNull();
  });

  it.each([
    ["another invalid request", invalidRequest("parameter_invalid_empty")],
    [
      "a connection failure",
      new Stripe.errors.StripeConnectionError({ message: "socket hang up" }),
    ],
  ])("rethrows %s while finding a session", async (_description, failure) => {
    // arrange
    const client = createStubClient();
    client.checkout.sessions.retrieve.mockRejectedValue(failure);
    const checkout = new StripePaymentCheckout(client);

    // act
    const finding = checkout.findCompletedSession("cs_test_paid");

    // assert
    await expect(finding).rejects.toBe(failure);
  });
});
