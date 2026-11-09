import { describe, expect, it } from "vitest";

import { ProductPricing } from "~/bounded-contexts/sales/store/domain/product";

import { StoredProductPricing } from "./stored-product-pricing.server";

describe("StoredProductPricing.fromColumns", () => {
  it("reads two stored amounts as a paid pricing", () => {
    // arrange
    const columns = { eurCents: 3900, usdCents: 4500 };

    // act
    const pricing = StoredProductPricing.fromColumns(columns).toPricing();

    // assert
    expect(pricing).toEqual(
      ProductPricing.reconstitute({ kind: "paid", ...columns }),
    );
  });

  it("reads empty stored amounts as free", () => {
    // arrange
    const columns = { eurCents: null, usdCents: null };

    // act
    const pricing = StoredProductPricing.fromColumns(columns).toPricing();

    // assert
    expect(pricing).toEqual(ProductPricing.free());
  });
});

describe("StoredProductPricing.fromPricing", () => {
  it.each([
    [
      "a paid pricing as its amounts",
      { kind: "paid", eurCents: 3900, usdCents: 4500 } as const,
      { eurCents: 3900, usdCents: 4500 },
    ],
    [
      "a free pricing as empty amounts",
      { kind: "free" } as const,
      { eurCents: null, usdCents: null },
    ],
  ])("stores %s", (_label, pricing, columns) => {
    // arrange
    // act
    const stored = StoredProductPricing.fromPricing(pricing).toSnapshot();

    // assert
    expect(stored).toEqual(columns);
  });

  it.each([
    [{ kind: "free" } as const],
    [{ kind: "paid", eurCents: 3900, usdCents: 4500 } as const],
  ])("reads back the pricing it stored for %o", (pricing) => {
    // arrange
    const columns = StoredProductPricing.fromPricing(pricing).toSnapshot();

    // act
    const readBack = StoredProductPricing.fromColumns(columns).toPricing();

    // assert
    expect(readBack.toSnapshot()).toEqual(pricing);
  });
});
