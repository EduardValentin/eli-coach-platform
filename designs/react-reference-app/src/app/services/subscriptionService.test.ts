import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CoachingSubscription } from '../domain/coachingSubscription';
import {
  cancelSubscription,
  SIMULATED_LATENCY_MS,
  startSubscriptionNow,
  SubscriptionError,
} from './subscriptionService';

const PURCHASED_AT = new Date(2026, 0, 10, 12);

const waiting: CoachingSubscription = {
  bundle: 3,
  startPath: 'waiting',
  purchasedAt: PURCHASED_AT,
  status: 'not-started',
  day1: new Date(2026, 0, 24, 12),
};

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('cancelling coaching', () => {
  it('refunds a waiting subscription cancelled before it starts', async () => {
    // arrange
    const cancelling = cancelSubscription(waiting, new Date(2026, 0, 20, 12));

    // act
    await vi.advanceTimersByTimeAsync(SIMULATED_LATENCY_MS);

    // assert
    await expect(cancelling).resolves.toMatchObject({
      fullRefund: true,
      subscription: { status: 'ended' },
    });
  });

  it('keeps access until the running period ends', async () => {
    // arrange
    const running = { ...waiting, status: 'active' as const };
    const cancelling = cancelSubscription(running, new Date(2026, 1, 1, 12));

    // act
    await vi.advanceTimersByTimeAsync(SIMULATED_LATENCY_MS);

    // assert
    await expect(cancelling).resolves.toMatchObject({
      fullRefund: false,
      subscription: {
        status: 'cancelled',
        periodEndsAt: new Date(2026, 3, 24, 12),
      },
    });
  });

  it('refuses to cancel coaching that has already ended', async () => {
    // arrange
    const ended = { ...waiting, status: 'ended' as const };
    const cancelling = cancelSubscription(ended, new Date(2026, 4, 1, 12));
    const isDomainError = expect(cancelling).rejects.toBeInstanceOf(
      SubscriptionError,
    );
    const carriesCode = expect(cancelling).rejects.toMatchObject({
      code: 'already-ended',
    });

    // act
    await vi.advanceTimersByTimeAsync(SIMULATED_LATENCY_MS);

    // assert
    await isDomainError;
    await carriesCode;
  });
});

describe('starting coaching now', () => {
  it('moves a waiting subscription onto the immediate path', async () => {
    // arrange
    const starting = startSubscriptionNow(waiting);

    // act
    await vi.advanceTimersByTimeAsync(SIMULATED_LATENCY_MS);

    // assert
    await expect(starting).resolves.toMatchObject({
      startPath: 'immediate',
      day1: undefined,
    });
  });
});
