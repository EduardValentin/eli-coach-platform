import Stripe from "stripe";
import { describe, expect, it } from "vitest";

import type { PaymentsConfig } from "~/bounded-contexts/sales/shared/payments/config.server";

import { InMemoryPaymentEventsAdapter } from "./memory/in-memory-payment-events-adapter.server";
import { PaymentProviderAdapter } from "./payment-provider-adapter.server";
import { StripePaymentEventsAdapter } from "./stripe/stripe-payment-events-adapter.server";

const STRIPE_CONFIG: PaymentsConfig = {
  PAYMENTS_PROVIDER: "stripe",
  STRIPE_SECRET_KEY: "sk_test_unit",
  STRIPE_WEBHOOK_SIGNING_SECRET: "whsec_unit",
};

describe("PaymentProviderAdapter", () => {
  it("returns the in-memory events double for the memory provider", () => {
    // arrange
    const config: PaymentsConfig = { PAYMENTS_PROVIDER: "memory" };

    // act
    const paymentProviderAdapter = new PaymentProviderAdapter(config);

    // assert
    expect(paymentProviderAdapter.paymentProvider).toEqual({ name: "memory" });
    expect(paymentProviderAdapter.paymentEventsPort).toBeInstanceOf(
      InMemoryPaymentEventsAdapter,
    );
  });

  it("returns the Stripe client and events adapter for the stripe provider", () => {
    // arrange
    const config = STRIPE_CONFIG;

    // act
    const paymentProviderAdapter = new PaymentProviderAdapter(config);

    // assert
    expect(paymentProviderAdapter.paymentProvider).toMatchObject({
      name: "stripe",
      stripeClient: expect.any(Stripe),
    });
    expect(paymentProviderAdapter.paymentEventsPort).toBeInstanceOf(
      StripePaymentEventsAdapter,
    );
  });

  it("refuses the stripe provider without a secret key", () => {
    // arrange
    const config: PaymentsConfig = {
      PAYMENTS_PROVIDER: "stripe",
      STRIPE_WEBHOOK_SIGNING_SECRET: "whsec_unit",
    };

    // act
    const create = () => new PaymentProviderAdapter(config);

    // assert
    expect(create).toThrow("STRIPE_SECRET_KEY");
  });

  it("refuses the stripe provider without a webhook signing secret", () => {
    // arrange
    const config: PaymentsConfig = {
      PAYMENTS_PROVIDER: "stripe",
      STRIPE_SECRET_KEY: "sk_test_unit",
    };

    // act
    const create = () => new PaymentProviderAdapter(config);

    // assert
    expect(create).toThrow("STRIPE_WEBHOOK_SIGNING_SECRET");
  });

  it("verifies Stripe signatures with the configured signing secret", async () => {
    // arrange
    const { paymentEventsPort } = new PaymentProviderAdapter(STRIPE_CONFIG);
    const rawBody = JSON.stringify({
      id: "evt_unit",
      type: "customer.created",
      created: 1790003600,
      data: { object: {} },
    });
    const signature = Stripe.webhooks.generateTestHeaderString({
      payload: rawBody,
      secret: "whsec_unit",
    });

    // act
    const verdict = await paymentEventsPort.verify(rawBody, signature);

    // assert
    expect(verdict).toEqual({ kind: "ignored" });
  });

  it("refuses an event signed with another secret", async () => {
    // arrange
    const { paymentEventsPort } = new PaymentProviderAdapter(STRIPE_CONFIG);
    const rawBody = JSON.stringify({
      id: "evt_unit",
      type: "customer.created",
      created: 1790003600,
      data: { object: {} },
    });
    const signature = Stripe.webhooks.generateTestHeaderString({
      payload: rawBody,
      secret: "whsec_another_account",
    });

    // act
    const verdict = await paymentEventsPort.verify(rawBody, signature);

    // assert
    expect(verdict).toEqual({ kind: "invalid" });
  });
});
