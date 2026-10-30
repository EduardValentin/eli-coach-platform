import { describe, expect, it } from "vitest";

import {
  cardBrandLabel,
  cardExpiryLine,
  cardNumberSpoken,
  formatCardExpiry,
  maskedCardNumber,
} from "./payment-method-copy";

describe("the card on file wording", () => {
  it.each([
    ["visa", "Visa"],
    ["mastercard", "Mastercard"],
    ["amex", "American Express"],
    ["discover", "Discover"],
    ["diners", "Diners Club"],
    ["jcb", "JCB"],
    ["unionpay", "UnionPay"],
    ["unknown", "Card"],
    ["eftpos_au", "Card"],
  ])("names the %s brand %s", (brand, label) => {
    // arrange, act
    const named = cardBrandLabel(brand);

    // assert
    expect(named).toBe(label);
  });

  it("masks the number down to its last four digits with real bullets", () => {
    // arrange
    const lastFour = "4242";

    // act
    const masked = maskedCardNumber(lastFour);

    // assert
    expect(masked).toBe("•••• 4242");
  });

  it("speaks the masked number as the digits it ends in", () => {
    // arrange
    const lastFour = "4242";

    // act
    const spoken = cardNumberSpoken(lastFour);

    // assert
    expect(spoken).toBe("ending in 4242");
  });

  it.each([
    [12, 2034, "12/34"],
    [3, 2031, "03/31"],
    [1, 2100, "01/00"],
  ])(
    "writes an expiry of month %i and year %i as %s",
    (expiryMonth, expiryYear, written) => {
      // arrange
      const expiry = { expiryMonth, expiryYear };

      // act
      const formatted = formatCardExpiry(expiry);

      // assert
      expect(formatted).toBe(written);
    },
  );

  it("reads the expiry as its own line", () => {
    // arrange
    const expiry = { expiryMonth: 12, expiryYear: 2034 };

    // act
    const line = cardExpiryLine(expiry);

    // assert
    expect(line).toBe("Expires 12/34");
  });
});
