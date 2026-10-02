import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CoachingSubscription } from '../domain/coachingSubscription';
import {
  cancelSubscription,
  openPaymentMethodPortal,
  PAYMENT_METHOD_PORTAL_PATH,
  SIMULATED_LATENCY_MS,
  startSubscriptionNow,
  SubscriptionError,
} from './subscriptionService';

const PURCHASED_AT = new Date(2026, 0, 10, 12);

const waiting: CoachingSubscription = {
  bundle: 3,
  startPath: 'waiting',
  purchasedAt: PURCHASED_AT,
  amountPaidCents: 44700,
  status: 'not-started',
  paymentProblem: false,
};

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

async function rejectionOf(pending: Promise<unknown>): Promise<unknown> {
  const caught = pending.catch((error: unknown) => error);
  await vi.advanceTimersByTimeAsync(SIMULATED_LATENCY_MS);

  return caught;
}

describe('cancelling coaching', () => {
  it('refunds a waiting subscription cancelled before the withdrawal deadline', async () => {
    // arrange
    const cancelling = cancelSubscription(
      waiting,
      new Date(2026, 0, 20, 12),
      'works',
    );

    // act
    await vi.advanceTimersByTimeAsync(SIMULATED_LATENCY_MS);

    // assert
    await expect(cancelling).resolves.toMatchObject({
      status: 'ended',
      refund: { amountCents: 44700, reason: 'full-refund' },
    });
  });

  it('keeps access until the bundle runs out once the withdrawal right is gone', async () => {
    // arrange
    const cancelling = cancelSubscription(
      waiting,
      new Date(2026, 1, 1, 12),
      'works',
    );

    // act
    await vi.advanceTimersByTimeAsync(SIMULATED_LATENCY_MS);

    // assert
    await expect(cancelling).resolves.toMatchObject({
      status: 'cancelled',
      periodEndsAt: new Date(2026, 3, 10, 12),
    });
  });

  it('refuses to cancel coaching that has already ended', async () => {
    // arrange
    const ended = { ...waiting, status: 'ended' as const };

    // act
    const error = await rejectionOf(
      cancelSubscription(ended, new Date(2026, 4, 1, 12), 'works'),
    );

    // assert
    expect(error).toBeInstanceOf(SubscriptionError);
    expect(error).toMatchObject({
      code: 'already-ended',
      message: 'This coaching has already ended, so there is nothing to cancel.',
    });
  });

  it('answers already ended when the provider has ended it first', async () => {
    // arrange
    const cancelling = cancelSubscription(
      waiting,
      new Date(2026, 0, 20, 12),
      'already-ended',
    );

    // act
    const error = await rejectionOf(cancelling);

    // assert
    expect(error).toMatchObject({ code: 'already-ended' });
  });

  it('asks her to try again when the provider is unavailable', async () => {
    // arrange
    const cancelling = cancelSubscription(
      waiting,
      new Date(2026, 0, 20, 12),
      'fails',
    );

    // act
    const error = await rejectionOf(cancelling);

    // assert
    expect(error).toMatchObject({
      code: 'cancel-unavailable',
      message:
        "Your coaching couldn't be cancelled just now. Nothing has changed, so please try again.",
    });
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

describe('opening the payment method portal', () => {
  it('hands her over to the payment method page', async () => {
    // arrange
    const opening = openPaymentMethodPortal('works');

    // act
    await vi.advanceTimersByTimeAsync(SIMULATED_LATENCY_MS);

    // assert
    await expect(opening).resolves.toEqual({
      url: PAYMENT_METHOD_PORTAL_PATH,
    });
  });

  it('asks her to try again when the portal cannot be opened', async () => {
    // arrange
    const opening = openPaymentMethodPortal('fails');

    // act
    const error = await rejectionOf(opening);

    // assert
    expect(error).toMatchObject({ code: 'payment-portal-unavailable' });
  });
});
