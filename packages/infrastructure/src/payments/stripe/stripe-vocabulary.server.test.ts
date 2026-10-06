import { describe, expect, it } from "vitest";

import { STRIPE_VOCABULARY } from "./stripe-vocabulary.server";

describe("STRIPE_VOCABULARY.standingOf", () => {
  it.each([
    ["canceled", "ended"],
    ["incomplete_expired", "ended"],
    ["past_due", "payment-problem"],
    ["unpaid", "payment-problem"],
    ["active", "healthy"],
    ["trialing", "other"],
    ["incomplete", "other"],
  ] as const)("reads Stripe's %s status as %s", (status, expected) => {
    // act
    const standing = STRIPE_VOCABULARY.standingOf(status);

    // assert
    expect(standing).toBe(expected);
  });
});

describe("STRIPE_VOCABULARY.invoiceReasonOf", () => {
  it.each([
    ["subscription_create", "purchase"],
    ["subscription_cycle", "renewal"],
    ["subscription_update", "renewal"],
    [null, "renewal"],
  ] as const)(
    "reads Stripe's %s billing reason as a %s",
    (reason, expected) => {
      // act
      const invoiceReason = STRIPE_VOCABULARY.invoiceReasonOf(reason);

      // assert
      expect(invoiceReason).toBe(expected);
    },
  );
});

describe("STRIPE_VOCABULARY.cardChangeOf", () => {
  it.each([
    ["payment_method.attached", "attached"],
    ["payment_method.automatically_updated", "updated"],
    ["payment_method.detached", "detached"],
    ["payment_method.updated", null],
    ["customer.updated", null],
    ["constructor", null],
    ["__proto__", null],
    ["toString", null],
  ] as const)(
    "reads Stripe's %s event as a card change %s",
    (type, expected) => {
      // act
      const change = STRIPE_VOCABULARY.cardChangeOf(type);

      // assert
      expect(change).toBe(expected);
    },
  );
});

describe("STRIPE_VOCABULARY.isCardPaymentMethod", () => {
  it.each([
    ["card", true],
    ["sepa_debit", false],
    ["link", false],
  ] as const)(
    "reads Stripe's %s payment method type as a card: %s",
    (type, expected) => {
      // act
      const isCard = STRIPE_VOCABULARY.isCardPaymentMethod(type);

      // assert
      expect(isCard).toBe(expected);
    },
  );
});
