import {
  STORE_CURRENCIES,
  STORE_CURRENCY_AMOUNT_FIELDS,
  type StoreCurrency,
} from "~/bounded-contexts/sales/store/domain/product";

import type { StoreProduct } from "./store";

export { STORE_CURRENCIES, type StoreCurrency };

export type StorePrice = NonNullable<StoreProduct["price"]>;

export const DEFAULT_STORE_CURRENCY: StoreCurrency = "EUR";
export const STORE_CURRENCY_COOKIE_NAME = "eli_store_currency";

const PRICE_FORMATS: Readonly<Record<StoreCurrency, Intl.NumberFormat>> = {
  EUR: new Intl.NumberFormat("en-IE", {
    currency: "EUR",
    minimumFractionDigits: 2,
    style: "currency",
  }),
  USD: new Intl.NumberFormat("en-US", {
    currency: "USD",
    minimumFractionDigits: 2,
    style: "currency",
  }),
};

export function isStoreCurrency(value: unknown): value is StoreCurrency {
  return STORE_CURRENCIES.some((currency) => currency === value);
}

export function readStoreCurrency(cookieHeader: string | null): StoreCurrency {
  const value = cookieHeader
    ?.split(";")
    .map((cookie) => cookie.trim().split("=", 2))
    .find(([name]) => name === STORE_CURRENCY_COOKIE_NAME)?.[1];

  return isStoreCurrency(value) ? value : DEFAULT_STORE_CURRENCY;
}

export function formatStorePrice(
  price: StorePrice,
  currency: StoreCurrency,
): string {
  return PRICE_FORMATS[currency].format(
    price[STORE_CURRENCY_AMOUNT_FIELDS[currency]] / 100,
  );
}
