import { describe, expect, it } from "vitest";

import { PaymentCard } from "./payment-card";

const VISA = {
  brand: "visa",
  lastFour: "4242",
  expiryMonth: 12,
  expiryYear: 2034,
  paymentMethodId: "pm_visa",
};

const MASTERCARD = {
  brand: "mastercard",
  lastFour: "4444",
  expiryMonth: 3,
  expiryYear: 2031,
  paymentMethodId: "pm_mastercard",
};

describe("PaymentCard", () => {
  it("keeps the brand, last four digits, expiry and payment method it was given", () => {
    // arrange
    const card = PaymentCard.of(VISA);

    // act
    const snapshot = card.toSnapshot();

    // assert
    expect(snapshot).toEqual(VISA);
  });

  it("makes an attached card the card on file when none is mirrored yet", () => {
    // arrange
    const attached = PaymentCard.of(VISA);

    // act
    const mirrored = PaymentCard.mirror(null, {
      kind: "card-attached",
      paymentCustomerId: "cus_1",
      card: attached,
    });

    // assert
    expect(mirrored).toEqual(attached);
  });

  it("replaces the card on file with a newly attached card", () => {
    // arrange
    const attached = PaymentCard.of(MASTERCARD);

    // act
    const mirrored = PaymentCard.mirror(PaymentCard.of(VISA), {
      kind: "card-attached",
      paymentCustomerId: "cus_1",
      card: attached,
    });

    // assert
    expect(mirrored).toEqual(attached);
  });

  it("takes the new expiry of a card the provider updated", () => {
    // arrange
    const updated = PaymentCard.of({ ...VISA, expiryYear: 2038 });

    // act
    const mirrored = PaymentCard.mirror(PaymentCard.of(VISA), {
      kind: "card-updated",
      paymentCustomerId: "cus_1",
      card: updated,
    });

    // assert
    expect(mirrored).toEqual(updated);
  });

  it("clears the card on file when that card is detached", () => {
    // arrange
    const stored = PaymentCard.of(VISA);

    // act
    const mirrored = PaymentCard.mirror(stored, {
      kind: "card-detached",
      paymentCustomerId: "cus_1",
      paymentMethodId: "pm_visa",
    });

    // assert
    expect(mirrored).toBeNull();
  });

  it("keeps the card on file when a card detached after a later attach is the earlier one", () => {
    // arrange
    const stored = PaymentCard.of(MASTERCARD);

    // act
    const mirrored = PaymentCard.mirror(stored, {
      kind: "card-detached",
      paymentCustomerId: "cus_1",
      paymentMethodId: "pm_visa",
    });

    // assert
    expect(mirrored).toBe(stored);
  });

  it("has no card on file after a detach when none was mirrored", () => {
    // arrange
    const event = {
      kind: "card-detached",
      paymentCustomerId: "cus_1",
      paymentMethodId: "pm_visa",
    } as const;

    // act
    const mirrored = PaymentCard.mirror(null, event);

    // assert
    expect(mirrored).toBeNull();
  });
});
