import type { ClientSettings } from "~/features/coaching-sales/contracts/client-subscription";

type CardExpiry = Pick<
  NonNullable<ClientSettings["card"]>,
  "expiryMonth" | "expiryYear"
>;

const MASK = "••••";

const CARD_BRAND_LABELS: Readonly<Record<string, string>> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  discover: "Discover",
  diners: "Diners Club",
  jcb: "JCB",
  unionpay: "UnionPay",
};

const UNNAMED_CARD_BRAND_LABEL = "Card";

export const CHANGE_PAYMENT_METHOD_LABEL = "Change";

export const OPENING_PAYMENT_METHOD_LABEL = "Opening…";

export const NO_PAYMENT_METHOD_LINE = "No payment method configured";

export const PAYMENT_PROBLEM_LINE =
  "Your last payment didn't go through. Update your card to keep your coaching going.";

export const PAYMENT_METHOD_UNAVAILABLE_MESSAGE =
  "Your payment details couldn't be opened just now. Please try again.";

export function cardBrandLabel(brand: string): string {
  return CARD_BRAND_LABELS[brand] ?? UNNAMED_CARD_BRAND_LABEL;
}

export function maskedCardNumber(lastFour: string): string {
  return `${MASK} ${lastFour}`;
}

export function cardNumberSpoken(lastFour: string): string {
  return `ending in ${lastFour}`;
}

export function formatCardExpiry({
  expiryMonth,
  expiryYear,
}: CardExpiry): string {
  const month = String(expiryMonth).padStart(2, "0");
  const year = String(expiryYear % 100).padStart(2, "0");

  return `${month}/${year}`;
}

export function cardExpiryLine(expiry: CardExpiry): string {
  return `Expires ${formatCardExpiry(expiry)}`;
}
