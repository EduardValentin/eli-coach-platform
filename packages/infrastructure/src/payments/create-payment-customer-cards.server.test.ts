import type { PaymentsConfig } from "@eli-coach-platform/config";
import { describe, expect, it } from "vitest";

import { createPaymentCustomerCards } from "./create-payment-customer-cards.server";
import { InMemoryPaymentCustomerCards } from "./memory/in-memory-payment-customer-cards.server";
import { StripePaymentCustomerCards } from "./stripe/stripe-payment-customer-cards.server";

describe("createPaymentCustomerCards", () => {
  it("returns the in-memory double for the memory provider", () => {
    // arrange
    const config: PaymentsConfig = { PAYMENTS_PROVIDER: "memory" };

    // act
    const cards = createPaymentCustomerCards(config);

    // assert
    expect(cards).toBeInstanceOf(InMemoryPaymentCustomerCards);
  });

  it("returns the Stripe adapter for the stripe provider", () => {
    // arrange
    const config: PaymentsConfig = {
      PAYMENTS_PROVIDER: "stripe",
      STRIPE_SECRET_KEY: "sk_test_unit",
      STRIPE_WEBHOOK_SIGNING_SECRET: "whsec_unit",
    };

    // act
    const cards = createPaymentCustomerCards(config);

    // assert
    expect(cards).toBeInstanceOf(StripePaymentCustomerCards);
  });

  it("refuses the stripe provider without a secret key", () => {
    // arrange
    const config: PaymentsConfig = {
      PAYMENTS_PROVIDER: "stripe",
      STRIPE_WEBHOOK_SIGNING_SECRET: "whsec_unit",
    };

    // act
    const create = () => createPaymentCustomerCards(config);

    // assert
    expect(create).toThrow("STRIPE_SECRET_KEY");
  });
});
