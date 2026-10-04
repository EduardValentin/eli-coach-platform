import type { CardOnFile } from '../domain/coachingSubscription';

export const TEST_VISA: CardOnFile = {
  brand: 'visa',
  lastFour: '4242',
  expiryMonth: 12,
  expiryYear: 2034,
};

export const TEST_MASTERCARD: CardOnFile = {
  brand: 'mastercard',
  lastFour: '4444',
  expiryMonth: 3,
  expiryYear: 2031,
};

export const TEST_VISA_DEBIT: CardOnFile = {
  brand: 'visa',
  lastFour: '5556',
  expiryMonth: 8,
  expiryYear: 2030,
};
