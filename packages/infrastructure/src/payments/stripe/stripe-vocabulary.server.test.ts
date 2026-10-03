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
