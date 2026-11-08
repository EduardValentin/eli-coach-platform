export type StoreCurrency = "EUR" | "USD";

const STORE_CURRENCIES: readonly StoreCurrency[] = ["EUR", "USD"];
const MINIMUM_PRICE_MINOR_UNITS = 1;
const MAXIMUM_PRICE_MINOR_UNITS = 99_999_999;

export type ProductPriceSnapshot = {
  eurCents: number;
  usdCents: number;
};

export type ProductPriceInput = {
  eurCents?: number;
  usdCents?: number;
};

export type ProductPriceIssue =
  | { code: "missing_price"; currency: StoreCurrency }
  | { code: "price_not_whole_minor_units"; currency: StoreCurrency }
  | {
      code: "price_out_of_range";
      currency: StoreCurrency;
      minimum: typeof MINIMUM_PRICE_MINOR_UNITS;
      maximum: typeof MAXIMUM_PRICE_MINOR_UNITS;
    };

export type ProductPriceParseResult =
  | { status: "valid"; price: ProductPrice }
  | { status: "invalid"; issues: readonly ProductPriceIssue[] };

export class ProductPrice {
  readonly eurCents: number;
  readonly usdCents: number;

  private constructor(snapshot: ProductPriceSnapshot) {
    this.eurCents = snapshot.eurCents;
    this.usdCents = snapshot.usdCents;
  }

  static parse(input: ProductPriceInput): ProductPriceParseResult {
    const amounts = { EUR: input.eurCents, USD: input.usdCents };
    const issues: ProductPriceIssue[] = [];

    for (const currency of STORE_CURRENCIES) {
      const amount = amounts[currency];

      if (amount === undefined) {
        issues.push({ code: "missing_price", currency });
      } else if (!Number.isInteger(amount)) {
        issues.push({ code: "price_not_whole_minor_units", currency });
      } else if (
        amount < MINIMUM_PRICE_MINOR_UNITS ||
        amount > MAXIMUM_PRICE_MINOR_UNITS
      ) {
        issues.push({
          code: "price_out_of_range",
          currency,
          minimum: MINIMUM_PRICE_MINOR_UNITS,
          maximum: MAXIMUM_PRICE_MINOR_UNITS,
        });
      }
    }

    if (
      issues.length > 0 ||
      amounts.EUR === undefined ||
      amounts.USD === undefined
    ) {
      return { status: "invalid", issues };
    }

    return {
      status: "valid",
      price: new ProductPrice({ eurCents: amounts.EUR, usdCents: amounts.USD }),
    };
  }

  static reconstitute(snapshot: ProductPriceSnapshot): ProductPrice {
    return new ProductPrice(snapshot);
  }

  amountIn(currency: StoreCurrency): number {
    return currency === "EUR" ? this.eurCents : this.usdCents;
  }

  equals(other: ProductPrice): boolean {
    return STORE_CURRENCIES.every(
      (currency) => this.amountIn(currency) === other.amountIn(currency),
    );
  }

  toSnapshot(): ProductPriceSnapshot {
    return { eurCents: this.eurCents, usdCents: this.usdCents };
  }
}
