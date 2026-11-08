export type StoreCurrency = "EUR" | "USD";

export const STORE_CURRENCIES: readonly StoreCurrency[] = ["EUR", "USD"];
const MINIMUM_PRICE_MINOR_UNITS = 1;
const MAXIMUM_PRICE_MINOR_UNITS = 99_999_999;

export type ProductPriceSnapshot = {
  eurCents: number;
  usdCents: number;
};

export const STORE_CURRENCY_AMOUNT_FIELDS = {
  EUR: "eurCents",
  USD: "usdCents",
} as const satisfies Record<StoreCurrency, keyof ProductPriceSnapshot>;

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
    const issues = STORE_CURRENCIES.flatMap(
      (currency) =>
        ProductPrice.amountIssue(
          currency,
          input[STORE_CURRENCY_AMOUNT_FIELDS[currency]],
        ) ?? [],
    );
    const { eurCents, usdCents } = input;

    if (eurCents === undefined || usdCents === undefined || issues.length > 0) {
      return { status: "invalid", issues };
    }

    return { status: "valid", price: new ProductPrice({ eurCents, usdCents }) };
  }

  static amountIssue(
    currency: StoreCurrency,
    amount: number | undefined,
  ): ProductPriceIssue | null {
    if (amount === undefined) {
      return { code: "missing_price", currency };
    }

    if (!Number.isInteger(amount)) {
      return { code: "price_not_whole_minor_units", currency };
    }

    if (
      amount < MINIMUM_PRICE_MINOR_UNITS ||
      amount > MAXIMUM_PRICE_MINOR_UNITS
    ) {
      return {
        code: "price_out_of_range",
        currency,
        minimum: MINIMUM_PRICE_MINOR_UNITS,
        maximum: MAXIMUM_PRICE_MINOR_UNITS,
      };
    }

    return null;
  }

  static reconstitute(snapshot: ProductPriceSnapshot): ProductPrice {
    return new ProductPrice(snapshot);
  }

  static fromStoredAmounts(amounts: {
    eurCents: number | null;
    usdCents: number | null;
  }): ProductPrice | null {
    if (amounts.eurCents === null || amounts.usdCents === null) {
      return null;
    }

    return new ProductPrice({
      eurCents: amounts.eurCents,
      usdCents: amounts.usdCents,
    });
  }

  amountIn(currency: StoreCurrency): number {
    return this[STORE_CURRENCY_AMOUNT_FIELDS[currency]];
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
