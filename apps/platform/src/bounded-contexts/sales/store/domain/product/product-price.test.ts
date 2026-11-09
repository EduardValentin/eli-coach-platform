import { describe, expect, it } from "vitest";

import { ProductPrice } from "./product-price";

describe("ProductPrice.parse", () => {
  it("accepts whole minor units for both currencies", () => {
    // arrange
    const input = { eurCents: 3900, usdCents: 4500 };

    // act
    const result = ProductPrice.parse(input);

    // assert
    expect(result.status).toBe("valid");
    expect(
      result.status === "valid" ? result.price.toSnapshot() : null,
    ).toEqual({ eurCents: 3900, usdCents: 4500 });
  });

  it.each([
    ["the lowest amount", 1],
    ["the ceiling", 99_999_999],
  ])("accepts %s", (_label, amount) => {
    // arrange
    const input = { eurCents: amount, usdCents: amount };

    // act
    const result = ProductPrice.parse(input);

    // assert
    expect(result.status).toBe("valid");
  });

  it("names the currency whose amount is missing", () => {
    // arrange
    const input = { eurCents: 3900 };

    // act
    const result = ProductPrice.parse(input);

    // assert
    expect(result).toEqual({
      status: "invalid",
      issues: [{ code: "missing_price", currency: "USD" }],
    });
  });

  it("reports both currencies when neither amount is given", () => {
    // arrange
    const input = {};

    // act
    const result = ProductPrice.parse(input);

    // assert
    expect(result).toEqual({
      status: "invalid",
      issues: [
        { code: "missing_price", currency: "EUR" },
        { code: "missing_price", currency: "USD" },
      ],
    });
  });

  it("refuses an amount that is not a whole number of minor units", () => {
    // arrange
    const input = { eurCents: 39.5, usdCents: 4500 };

    // act
    const result = ProductPrice.parse(input);

    // assert
    expect(result).toEqual({
      status: "invalid",
      issues: [{ code: "price_not_whole_minor_units", currency: "EUR" }],
    });
  });

  it.each([
    ["zero", 0],
    ["a negative amount", -100],
    ["an amount above the ceiling", 100_000_000],
  ])("refuses %s with the accepted range", (_label, amount) => {
    // arrange
    const input = { eurCents: 3900, usdCents: amount };

    // act
    const result = ProductPrice.parse(input);

    // assert
    expect(result).toEqual({
      status: "invalid",
      issues: [
        {
          code: "price_out_of_range",
          currency: "USD",
          minimum: 1,
          maximum: 99_999_999,
        },
      ],
    });
  });
});

describe("ProductPrice.equals", () => {
  it("treats the same amounts as the same price", () => {
    // arrange
    const price = ProductPrice.reconstitute({ eurCents: 3900, usdCents: 4500 });
    const other = ProductPrice.reconstitute({ eurCents: 3900, usdCents: 4500 });

    // act
    const equal = price.equals(other);

    // assert
    expect(equal).toBe(true);
  });

  it("treats a different amount in either currency as a different price", () => {
    // arrange
    const price = ProductPrice.reconstitute({ eurCents: 3900, usdCents: 4500 });
    const other = ProductPrice.reconstitute({ eurCents: 3900, usdCents: 4600 });

    // act
    const equal = price.equals(other);

    // assert
    expect(equal).toBe(false);
  });
});

describe("ProductPrice.amountIn", () => {
  it("reads the fixed amount for each currency", () => {
    // arrange
    const price = ProductPrice.reconstitute({ eurCents: 3900, usdCents: 4500 });

    // act
    const amounts = [price.amountIn("EUR"), price.amountIn("USD")];

    // assert
    expect(amounts).toEqual([3900, 4500]);
  });
});
