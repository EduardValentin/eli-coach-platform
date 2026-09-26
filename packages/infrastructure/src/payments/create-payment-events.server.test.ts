import type { PaymentsConfig } from "@eli-coach-platform/config";
import Stripe from "stripe";
import { describe, expect, it } from "vitest";

import { createPaymentEvents } from "./create-payment-events.server";
import { InMemoryPaymentEvents } from "./memory/in-memory-payment-events.server";
import { StripePaymentEvents } from "./stripe/stripe-payment-events.server";

describe("createPaymentEvents", () => {
  it("returns the in-memory double for the memory provider", () => {
    // arrange
    const config: PaymentsConfig = { PAYMENTS_PROVIDER: "memory" };

    // act
    const events = createPaymentEvents(config);

    // assert
    expect(events).toBeInstanceOf(InMemoryPaymentEvents);
  });

  it("verifies Stripe signatures with the configured signing secret", async () => {
    // arrange
    const events = createPaymentEvents({
      PAYMENTS_PROVIDER: "stripe",
      STRIPE_SECRET_KEY: "sk_test_unit",
      STRIPE_WEBHOOK_SIGNING_SECRET: "whsec_unit",
    });
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
    const verdict = await events.verify(rawBody, signature);

    // assert
    expect(events).toBeInstanceOf(StripePaymentEvents);
    expect(verdict).toEqual({ kind: "ignored" });
  });

  it("refuses the stripe provider without a webhook signing secret", () => {
    // arrange
    const config: PaymentsConfig = {
      PAYMENTS_PROVIDER: "stripe",
      STRIPE_SECRET_KEY: "sk_test_unit",
    };

    // act
    const create = () => createPaymentEvents(config);

    // assert
    expect(create).toThrow("STRIPE_WEBHOOK_SIGNING_SECRET");
  });
});
