import { describe, expect, it } from "vitest";

import {
  DEFAULT_STORE_CURRENCY,
  formatStoreAmount,
  formatStorePrice,
  readStoreCurrency,
  STORE_CURRENCY_COOKIE_NAME,
} from "./store-currency";

describe("reading the store currency", () => {
  it("shows euros when the request carries no cookies", () => {
    // arrange
    const cookieHeader = null;

    // act
    const currency = readStoreCurrency(cookieHeader);

    // assert
    expect(currency).toBe("EUR");
    expect(DEFAULT_STORE_CURRENCY).toBe("EUR");
  });

  it("takes the currency the visitor chose from among other cookies", () => {
    // arrange
    const cookieHeader = `theme=dark; ${STORE_CURRENCY_COOKIE_NAME}=USD; other=1`;

    // act
    const currency = readStoreCurrency(cookieHeader);

    // assert
    expect(currency).toBe("USD");
  });

  it("falls back to euros for a currency the store does not offer", () => {
    // arrange
    const cookieHeader = `${STORE_CURRENCY_COOKIE_NAME}=GBP`;

    // act
    const currency = readStoreCurrency(cookieHeader);

    // assert
    expect(currency).toBe("EUR");
  });

  it("ignores a cookie whose name only ends like the currency cookie", () => {
    // arrange
    const cookieHeader = `x${STORE_CURRENCY_COOKIE_NAME}=USD`;

    // act
    const currency = readStoreCurrency(cookieHeader);

    // assert
    expect(currency).toBe("EUR");
  });
});

describe("formatting a store price", () => {
  it("writes the euro amount with the symbol first and two decimals", () => {
    // arrange
    const price = { eurCents: 3900, usdCents: 4500 };

    // act
    const formatted = formatStorePrice(price, "EUR");

    // assert
    expect(formatted).toBe("€39.00");
  });

  it("writes the dollar amount with the symbol first and two decimals", () => {
    // arrange
    const price = { eurCents: 3900, usdCents: 4500 };

    // act
    const formatted = formatStorePrice(price, "USD");

    // assert
    expect(formatted).toBe("$45.00");
  });

  it("keeps the cents and groups the thousands", () => {
    // arrange
    const price = { eurCents: 1234567, usdCents: 99 };

    // act
    const euros = formatStorePrice(price, "EUR");
    const dollars = formatStorePrice(price, "USD");

    // assert
    expect(euros).toBe("€12,345.67");
    expect(dollars).toBe("$0.99");
  });
});

describe("formatting a store amount", () => {
  it("writes an order amount in minor units in the order's currency", () => {
    // arrange
    const amounts = [
      { amountMinorUnits: 6800, currency: "EUR" as const },
      { amountMinorUnits: 7800, currency: "USD" as const },
    ];

    // act
    const formatted = amounts.map(({ amountMinorUnits, currency }) =>
      formatStoreAmount(amountMinorUnits, currency),
    );

    // assert
    expect(formatted).toEqual(["€68.00", "$78.00"]);
  });
});
