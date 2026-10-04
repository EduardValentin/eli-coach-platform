import { describe, expect, it } from "vitest";

import {
  readCardDetails,
  readPaymentCardChange,
} from "./payment-card-change.server";
import { STRIPE_VOCABULARY } from "./stripe/stripe-vocabulary.server";

function cardPaymentMethod(overrides: Record<string, unknown> = {}) {
  return {
    id: "pm_visa",
    object: "payment_method",
    type: "card",
    customer: "cus_test",
    card: {
      brand: "visa",
      last4: "4242",
      exp_month: 12,
      exp_year: 2034,
      funding: "credit",
    },
    ...overrides,
  };
}

const VISA_DETAILS = {
  paymentMethodId: "pm_visa",
  brand: "visa",
  lastFour: "4242",
  expiryMonth: 12,
  expiryYear: 2034,
};

describe("readPaymentCardChange", () => {
  it.each([
    ["payment_method.attached", "attached"],
    ["payment_method.automatically_updated", "updated"],
  ] as const)("reads %s as a card %s to its customer", (type, kind) => {
    // arrange
    const event = {
      type,
      object: cardPaymentMethod(),
      previousAttributes: null,
    };

    // act
    const change = readPaymentCardChange(event, STRIPE_VOCABULARY);

    // assert
    expect(change).toEqual({ kind, customerId: "cus_test", ...VISA_DETAILS });
  });

  it("reads a detached card with the customer it was detached from", () => {
    // arrange
    const event = {
      type: "payment_method.detached",
      object: cardPaymentMethod({ customer: null }),
      previousAttributes: { customer: "cus_test" },
    };

    // act
    const change = readPaymentCardChange(event, STRIPE_VOCABULARY);

    // assert
    expect(change).toEqual({
      kind: "detached",
      customerId: "cus_test",
      ...VISA_DETAILS,
    });
  });

  it("reads the customer of an expanded payment method", () => {
    // arrange
    const event = {
      type: "payment_method.attached",
      object: cardPaymentMethod({ customer: { id: "cus_test" } }),
      previousAttributes: null,
    };

    // act
    const change = readPaymentCardChange(event, STRIPE_VOCABULARY);

    // assert
    expect(change).toMatchObject({ customerId: "cus_test" });
  });

  it.each([
    [
      "a payment method that is not a card",
      cardPaymentMethod({ type: "sepa_debit", card: null }),
    ],
    ["a card without its details", cardPaymentMethod({ card: null })],
    [
      "a card with an unreadable last four",
      cardPaymentMethod({
        card: { brand: "visa", last4: "42", exp_month: 12, exp_year: 2034 },
      }),
    ],
    ["a card belonging to no customer", cardPaymentMethod({ customer: null })],
  ])("reads nothing from %s", (_label, object) => {
    // arrange
    const event = {
      type: "payment_method.attached",
      object,
      previousAttributes: null,
    };

    // act
    const change = readPaymentCardChange(event, STRIPE_VOCABULARY);

    // assert
    expect(change).toBeNull();
  });

  it("reads nothing from an event that is not a card change", () => {
    // arrange
    const event = {
      type: "payment_method.updated",
      object: cardPaymentMethod(),
      previousAttributes: null,
    };

    // act
    const change = readPaymentCardChange(event, STRIPE_VOCABULARY);

    // assert
    expect(change).toBeNull();
  });
});

describe("readCardDetails", () => {
  it("reads the brand, last four, expiry and id of a card payment method", () => {
    // arrange
    const paymentMethod = cardPaymentMethod({ customer: null });

    // act
    const details = readCardDetails(paymentMethod, STRIPE_VOCABULARY);

    // assert
    expect(details).toEqual(VISA_DETAILS);
  });

  it("reads nothing from a payment method that is not a card", () => {
    // arrange
    const paymentMethod = cardPaymentMethod({ type: "link", card: null });

    // act
    const details = readCardDetails(paymentMethod, STRIPE_VOCABULARY);

    // assert
    expect(details).toBeNull();
  });
});
