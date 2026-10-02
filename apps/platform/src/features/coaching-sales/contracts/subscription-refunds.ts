import type { RefundReason } from "@eli-coach-platform/domain/coaching-subscription";

export const REFUND_REASON_LABELS: Readonly<Record<RefundReason, string>> = {
  "full-refund": "Full refund: cancelled within the 14-day withdrawal period.",
  "proportional-refund":
    "Proportional refund: cancelled within 14 days of paying, for the unused part of the first term.",
  "coach-issued": "Refunded from the payment provider.",
};

const MONEY_LOCALE = "en-IE";
const CENTS_PER_UNIT = 100;

export function formatMoneyCents(cents: number, currency: string): string {
  return new Intl.NumberFormat(MONEY_LOCALE, {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / CENTS_PER_UNIT);
}
