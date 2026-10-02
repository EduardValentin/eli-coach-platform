import type { PaymentsConfig } from "@eli-coach-platform/config";
import { describe, expect, it } from "vitest";

import { createPaymentSubscriptions } from "./create-payment-subscriptions.server";
import { InMemoryPaymentSubscriptions } from "./memory/in-memory-payment-subscriptions.server";
import { StripePaymentSubscriptions } from "./stripe/stripe-payment-subscriptions.server";

describe("createPaymentSubscriptions", () => {
  it("returns the in-memory double for the memory provider", () => {
    // arrange
    const config: PaymentsConfig = { PAYMENTS_PROVIDER: "memory" };

    // act
    const subscriptions = createPaymentSubscriptions(config);

    // assert
    expect(subscriptions).toBeInstanceOf(InMemoryPaymentSubscriptions);
  });

  it("returns the Stripe adapter for the stripe provider", () => {
    // arrange
    const config: PaymentsConfig = {
      PAYMENTS_PROVIDER: "stripe",
      STRIPE_SECRET_KEY: "sk_test_unit",
      STRIPE_WEBHOOK_SIGNING_SECRET: "whsec_unit",
    };

    // act
    const subscriptions = createPaymentSubscriptions(config);

    // assert
    expect(subscriptions).toBeInstanceOf(StripePaymentSubscriptions);
  });

  it("refuses the stripe provider without a secret key", () => {
    // arrange
    const config: PaymentsConfig = {
      PAYMENTS_PROVIDER: "stripe",
      STRIPE_WEBHOOK_SIGNING_SECRET: "whsec_unit",
    };

    // act
    const create = () => createPaymentSubscriptions(config);

    // assert
    expect(create).toThrow("STRIPE_SECRET_KEY");
  });
});
