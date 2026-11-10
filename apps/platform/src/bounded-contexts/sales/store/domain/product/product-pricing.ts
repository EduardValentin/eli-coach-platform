import {
  ProductPrice,
  type StoreCurrency,
  type ProductPriceInput,
  type ProductPriceIssue,
  type ProductPriceSnapshot,
} from "./product-price";

export type ProductPricingSnapshot =
  { kind: "free" } | ({ kind: "paid" } & ProductPriceSnapshot);

export type ProductPricingInput =
  { kind: "free" } | ({ kind: "paid" } & ProductPriceInput);

export type ProductPricingParseResult =
  | { status: "valid"; pricing: ProductPricing }
  | { status: "invalid"; issues: readonly ProductPriceIssue[] };

type ProductPricingState =
  { kind: "free" } | { kind: "paid"; price: ProductPrice };

export class ProductPricing {
  private constructor(private readonly state: ProductPricingState) {}

  static free(): ProductPricing {
    return new ProductPricing({ kind: "free" });
  }

  static paid(price: ProductPrice): ProductPricing {
    return new ProductPricing({ kind: "paid", price });
  }

  static parse(input: ProductPricingInput): ProductPricingParseResult {
    if (input.kind === "free") {
      return { status: "valid", pricing: ProductPricing.free() };
    }

    const parsed = ProductPrice.parse(input);

    return parsed.status === "valid"
      ? { status: "valid", pricing: ProductPricing.paid(parsed.price) }
      : parsed;
  }

  static reconstitute(snapshot: ProductPricingSnapshot): ProductPricing {
    if (snapshot.kind === "free") {
      return ProductPricing.free();
    }

    return ProductPricing.paid(
      ProductPrice.reconstitute({
        eurCents: snapshot.eurCents,
        usdCents: snapshot.usdCents,
      }),
    );
  }

  isPaid(): boolean {
    return this.state.kind === "paid";
  }

  amountIn(currency: StoreCurrency): number {
    return this.state.kind === "free" ? 0 : this.state.price.amountIn(currency);
  }

  equals(other: ProductPricing): boolean {
    if (this.state.kind === "free" || other.state.kind === "free") {
      return this.state.kind === other.state.kind;
    }

    return this.state.price.equals(other.state.price);
  }

  toSnapshot(): ProductPricingSnapshot {
    return this.state.kind === "free"
      ? { kind: "free" }
      : { kind: "paid", ...this.state.price.toSnapshot() };
  }
}
