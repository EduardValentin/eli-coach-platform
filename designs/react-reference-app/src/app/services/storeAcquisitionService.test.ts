import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isValidAcquisitionEmail,
  StoreAcquisitionError,
  submitStoreAcquisition,
} from './storeAcquisitionService';

describe('isValidAcquisitionEmail', () => {
  it('accepts a plausible email and rejects malformed input', () => {
    // arrange
    const valid = 'woman@example.com';
    const invalid = 'not-an-email';

    // act
    const validResult = isValidAcquisitionEmail(valid);
    const invalidResult = isValidAcquisitionEmail(invalid);

    // assert
    expect(validResult).toBe(true);
    expect(invalidResult).toBe(false);
  });
});

describe('submitStoreAcquisition', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves with success when the mocked outcome is success', async () => {
    // arrange
    const submission = submitStoreAcquisition({
      email: '  Woman@Example.com  ',
      productIds: ['hormone-harmony-ebook'],
      marketingConsent: false,
      outcome: 'success',
    });

    // act
    await vi.advanceTimersByTimeAsync(1200);

    // assert
    await expect(submission).resolves.toEqual({ success: true });
  });

  it.each([
    ['bot-rejected', 'BOT_REJECTED'],
    ['delivery-failure', 'DELIVERY_FAILURE'],
    ['server-error', 'SERVER_ERROR'],
    ['unavailable-product', 'UNAVAILABLE_PRODUCT'],
    ['rate-limited', 'RATE_LIMITED'],
  ] as const)(
    'rejects with the %s error code when that outcome is mocked',
    async (outcome, code) => {
      // arrange
      const submission = submitStoreAcquisition({
        email: 'woman@example.com',
        productIds: ['hormone-harmony-ebook'],
        marketingConsent: true,
        outcome,
      });
      const result = expect(submission).rejects.toMatchObject<
        Partial<StoreAcquisitionError>
      >({ code });

      // act
      await vi.advanceTimersByTimeAsync(1200);

      // assert
      await result;
    },
  );
});
