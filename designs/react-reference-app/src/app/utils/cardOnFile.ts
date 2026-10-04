import type { CardOnFile } from '../domain/coachingSubscription';

const MASK = '••••';

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
