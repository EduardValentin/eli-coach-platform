import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  submitWaitlistEmail,
  WaitlistError,
} from './waitlistService';

describe('submitWaitlistEmail', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the same generic success for a new email and its duplicate', async () => {
    // arrange
    const newSubmission = submitWaitlistEmail('  woman@example.com  ');
    await vi.advanceTimersByTimeAsync(1200);
    const newResult = await newSubmission;

    // act
    const duplicateSubmission = submitWaitlistEmail('WOMAN@EXAMPLE.COM');
    await vi.advanceTimersByTimeAsync(1200);
    const duplicateResult = await duplicateSubmission;

    // assert
    expect(newResult).toEqual({ success: true });
    expect(duplicateResult).toEqual({ success: true });
  });

  it('keeps invalid email addresses as real failures', async () => {
    // arrange
    const submission = submitWaitlistEmail('not-an-email');
    const result = expect(submission).rejects.toMatchObject<
      Partial<WaitlistError>
    >({
      code: 'INVALID_EMAIL',
    });

    // act
    await vi.advanceTimersByTimeAsync(1200);

    // assert
    await result;
  });

  it('keeps simulated server errors as real failures', async () => {
    // arrange
    const submission = submitWaitlistEmail('servererror');
    const result = expect(submission).rejects.toMatchObject<
      Partial<WaitlistError>
    >({
      code: 'SERVER_ERROR',
    });

    // act
    await vi.advanceTimersByTimeAsync(1200);

    // assert
    await result;
  });
});
