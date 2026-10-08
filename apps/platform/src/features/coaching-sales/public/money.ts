const MONEY_LOCALE = "en-IE";
const CENTS_PER_UNIT = 100;

export function formatMoney(cents: number, currency: string): string {
  const fractionDigits = cents % CENTS_PER_UNIT === 0 ? 0 : 2;

  return new Intl.NumberFormat(MONEY_LOCALE, {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(cents / CENTS_PER_UNIT);
}
