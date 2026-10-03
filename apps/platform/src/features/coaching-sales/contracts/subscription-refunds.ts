import type { RefundReason } from "@eli-coach-platform/domain/coaching-subscription";

export const REFUND_REASON_LABELS: Readonly<Record<RefundReason, string>> = {
  "full-refund": "Full refund: cancelled within the 14-day withdrawal period.",
  "coach-issued": "Refunded from the payment provider.",
};

const MONEY_LOCALE = "en-IE";
const CENTS_PER_UNIT = 100;

export function formatMoneyCents(cents: number, currency: string): string {
  const fractionDigits = cents % CENTS_PER_UNIT === 0 ? 0 : 2;

  return new Intl.NumberFormat(MONEY_LOCALE, {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(cents / CENTS_PER_UNIT);
}
