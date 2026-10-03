import { describe, expect, it } from "vitest";

import { formatMoneyCents } from "./subscription-refunds";

describe("formatMoneyCents", () => {
  it("reads a whole amount in euros without decimals", () => {
    // arrange
    const cents = 44_700;

    // act
    const amount = formatMoneyCents(cents, "eur");

    // assert
    expect(amount).toBe("€447");
  });

  it("reads an amount with cents to two decimals", () => {
    // arrange
    const cents = 14_833;

    // act
    const amount = formatMoneyCents(cents, "EUR");

    // assert
    expect(amount).toBe("€148.33");
  });

  it("keeps a trailing zero cent", () => {
    // arrange
    const cents = 14_830;

    // act
    const amount = formatMoneyCents(cents, "EUR");

    // assert
    expect(amount).toBe("€148.30");
  });

  it("groups thousands", () => {
    // arrange
    const cents = 123_400;

    // act
    const amount = formatMoneyCents(cents, "EUR");

    // assert
    expect(amount).toBe("€1,234");
  });
});
