import { describe, expect, it } from 'vitest';
import { counted } from './counted';

describe('counted', () => {
  it('keeps the noun singular only for one', () => {
    // act
    const phrases = [0, 1, 2].map(count => counted(count, 'session'));

    // assert
    expect(phrases).toEqual(['0 sessions', '1 session', '2 sessions']);
  });
});
