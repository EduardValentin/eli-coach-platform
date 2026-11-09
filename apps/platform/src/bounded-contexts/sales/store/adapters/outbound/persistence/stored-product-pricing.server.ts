import {
  ProductPricing,
  type ProductPricingSnapshot,
} from "~/bounded-contexts/sales/store/domain/product";

export type StoredProductPricingSnapshot = {
  eurCents: number | null;
  usdCents: number | null;
};

export class StoredProductPricing {
  private constructor(private readonly columns: StoredProductPricingSnapshot) {}

  static fromColumns(
    columns: StoredProductPricingSnapshot,
  ): StoredProductPricing {
    return new StoredProductPricing({
      eurCents: columns.eurCents,
      usdCents: columns.usdCents,
    });
  }

  static fromPricing(pricing: ProductPricingSnapshot): StoredProductPricing {
    return pricing.kind === "paid"
      ? new StoredProductPricing({
          eurCents: pricing.eurCents,
          usdCents: pricing.usdCents,
        })
      : new StoredProductPricing({ eurCents: null, usdCents: null });
  }

  toPricing(): ProductPricing {
    const { eurCents, usdCents } = this.columns;

    if (eurCents === null || usdCents === null) {
      return ProductPricing.free();
    }

    return ProductPricing.reconstitute({ kind: "paid", eurCents, usdCents });
  }

  toSnapshot(): StoredProductPricingSnapshot {
    return { ...this.columns };
  }
}
