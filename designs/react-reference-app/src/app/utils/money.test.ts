import { describe, expect, it } from 'vitest';
import { formatEuroCents } from './money';

describe('formatting euro amounts', () => {
  it('prints whole euros without decimals', () => {
    // arrange
    const cents = 44700;

    // act
    const amount = formatEuroCents(cents);

    // assert
    expect(amount).toBe('€447');
  });

  it('keeps two decimals when there are cents', () => {
    // arrange
    const cents = 14833;

    // act
    const amount = formatEuroCents(cents);

    // assert
    expect(amount).toBe('€148.33');
  });

  it('keeps a trailing zero in the cents', () => {
    // arrange
    const cents = 43710;

    // act
    const amount = formatEuroCents(cents);

    // assert
    expect(amount).toBe('€437.10');
  });

  it('groups thousands', () => {
    // arrange
    const cents = 123400;

    // act
    const amount = formatEuroCents(cents);

    // assert
    expect(amount).toBe('€1,234');
  });
});
