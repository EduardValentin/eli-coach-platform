import { describe, expect, it } from 'vitest';
import { formatStorePrice } from './StoreContext';

describe('formatStorePrice', () => {
  it.each([
    [39, 'EUR', '€39.00'],
    [45, 'USD', '$45.00'],
    [1234.5, 'EUR', '€1,234.50'],
    [1234.5, 'USD', '$1,234.50'],
  ] as const)('formats %s %s as %s', (amount, currency, expected) => {
    // arrange
    const price = { amount, currency };

    // act
    const formatted = formatStorePrice(price.amount, price.currency);

    // assert
    expect(formatted).toBe(expected);
  });
});
