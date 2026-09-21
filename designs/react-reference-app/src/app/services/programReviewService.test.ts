import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  scheduleReviewCall,
  SIMULATED_LATENCY_MS,
} from './programReviewService';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 0, 10, 12));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('scheduling a review call', () => {
  it('holds the start the client picked against her journey', async () => {
    // arrange
    const startsAt = new Date(2026, 0, 11, 18);
    const scheduling = scheduleReviewCall('ac-1', startsAt);

    // act
    await vi.advanceTimersByTimeAsync(SIMULATED_LATENCY_MS);

    // assert
    const scheduled = await scheduling;
    expect(scheduled).toMatchObject({ journeyId: 'ac-1', startsAt });
    expect(scheduled.scheduledAt).toBeInstanceOf(Date);
  });
});
