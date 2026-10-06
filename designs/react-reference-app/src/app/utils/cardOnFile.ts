import type { CardBrand, CardOnFile } from '../domain/coachingSubscription';

const MASK = '••••';

export const NO_PAYMENT_METHOD_LINE = 'No payment method configured';

export const CARD_BRAND_LABELS: Record<CardBrand, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'American Express',
  discover: 'Discover',
  diners: 'Diners Club',
  jcb: 'JCB',
  unionpay: 'UnionPay',
  unknown: 'Card',
};

export function maskedCardNumber(lastFour: string): string {
  return `${MASK} ${lastFour}`;
}

export function formatCardExpiry({
  expiryMonth,
  expiryYear,
}: Pick<CardOnFile, 'expiryMonth' | 'expiryYear'>): string {
  const month = String(expiryMonth).padStart(2, '0');
  const year = String(expiryYear % 100).padStart(2, '0');

  return `${month}/${year}`;
}

export function cardNumberSpoken(lastFour: string): string {
  return `ending in ${lastFour}`;
}

export function cardExpiryLine(
  card: Pick<CardOnFile, 'expiryMonth' | 'expiryYear'>,
): string {
  return `Expires ${formatCardExpiry(card)}`;
}
