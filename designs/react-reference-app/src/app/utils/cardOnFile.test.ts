import { describe, expect, it } from 'vitest';
import { formatCardExpiry, maskedCardNumber } from './cardOnFile';

describe('the card on file', () => {
  it('masks the number down to its last four digits', () => {
    // arrange
    const lastFour = '4242';

    // act
    const masked = maskedCardNumber(lastFour);

    // assert
    expect(masked).toBe('•••• 4242');
  });

  it('reads the expiry as two-digit month and year', () => {
    // arrange
    const card = { expiryMonth: 3, expiryYear: 2031 };

    // act
    const expiry = formatCardExpiry(card);

    // assert
    expect(expiry).toBe('03/31');
  });

  it('keeps a two-digit month as it is', () => {
    // arrange
    const card = { expiryMonth: 12, expiryYear: 2034 };

    // act
    const expiry = formatCardExpiry(card);

    // assert
    expect(expiry).toBe('12/34');
  });
});
