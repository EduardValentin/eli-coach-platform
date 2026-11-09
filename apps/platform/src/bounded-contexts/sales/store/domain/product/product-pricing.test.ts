import { describe, expect, it } from "vitest";

import { ProductPrice } from "./product-price";
import { ProductPricing } from "./product-pricing";

const paidPrice = ProductPrice.reconstitute({ eurCents: 3900, usdCents: 4500 });

describe("ProductPricing.parse", () => {
  it("accepts a free pricing", () => {
    // arrange
    const input = { kind: "free" } as const;

    // act
    const result = ProductPricing.parse(input);

    // assert
    expect(
      result.status === "valid" ? result.pricing.toSnapshot() : null,
    ).toEqual({ kind: "free" });
  });

  it("accepts a paid pricing with both amounts", () => {
    // arrange
    const input = { kind: "paid", eurCents: 3900, usdCents: 4500 } as const;

    // act
    const result = ProductPricing.parse(input);

    // assert
    expect(
      result.status === "valid" ? result.pricing.toSnapshot() : null,
    ).toEqual({ kind: "paid", eurCents: 3900, usdCents: 4500 });
  });

  it("names the price rules a paid pricing breaks", () => {
    // arrange
    const input = { kind: "paid", eurCents: 0 } as const;

    // act
    const result = ProductPricing.parse(input);

    // assert
    expect(result).toEqual({
      status: "invalid",
      issues: [
        {
          code: "price_out_of_range",
          currency: "EUR",
          minimum: 1,
          maximum: 99_999_999,
        },
        { code: "missing_price", currency: "USD" },
      ],
    });
  });
});

describe("ProductPricing.isPaid", () => {
  it.each([
    ["free", ProductPricing.free(), false],
    ["paid", ProductPricing.paid(paidPrice), true],
  ])("reports a %s pricing", (_label, pricing, paid) => {
    // arrange
    // act
    const isPaid = pricing.isPaid();

    // assert
    expect(isPaid).toBe(paid);
  });
});

describe("ProductPricing.equals", () => {
  it.each([
    ["free and free", ProductPricing.free(), ProductPricing.free(), true],
    [
      "the same amounts",
      ProductPricing.paid(paidPrice),
      ProductPricing.reconstitute({
        kind: "paid",
        eurCents: 3900,
        usdCents: 4500,
      }),
      true,
    ],
    [
      "a different amount",
      ProductPricing.paid(paidPrice),
      ProductPricing.reconstitute({
        kind: "paid",
        eurCents: 3900,
        usdCents: 4600,
      }),
      false,
    ],
    [
      "free and paid",
      ProductPricing.free(),
      ProductPricing.paid(paidPrice),
      false,
    ],
    [
      "paid and free",
      ProductPricing.paid(paidPrice),
      ProductPricing.free(),
      false,
    ],
  ])("compares %s", (_label, pricing, other, equal) => {
    // arrange
    // act
    const result = pricing.equals(other);

    // assert
    expect(result).toBe(equal);
  });
});

describe("ProductPricing.reconstitute", () => {
  it.each([
    [{ kind: "free" } as const],
    [{ kind: "paid", eurCents: 3900, usdCents: 4500 } as const],
  ])("round-trips the snapshot %o", (snapshot) => {
    // arrange
    // act
    const pricing = ProductPricing.reconstitute(snapshot);

    // assert
    expect(pricing.toSnapshot()).toEqual(snapshot);
  });
});
