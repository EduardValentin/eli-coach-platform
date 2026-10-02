import { describe, expect, it } from 'vitest';
import {
  cancel,
  cancellationRule,
  canStartWork,
  endSubscription,
  currentPeriod,
  deriveStatus,
  needsRefund,
  outstandingRefundCents,
  periodEnd,
  proportionalRefundCents,
  resolveDay1,
  settleRefund,
  startNow,
  type CoachingSubscription,
  type SubscriptionBundle,
  type SubscriptionStartPath,
  workStartDate,
} from './coachingSubscription';

const PURCHASED_AT = new Date(2026, 0, 10, 12);
const WITHDRAWAL_DEADLINE = new Date(2026, 0, 24, 12);
const AMOUNT_PAID_CENTS = 44700;

type SubscriptionOverrides = {
  bundle?: SubscriptionBundle;
  startPath?: SubscriptionStartPath;
  day1?: Date;
  periodEndsAt?: Date;
  status?: CoachingSubscription['status'];
  amountPaidCents?: number;
};

function subscription(overrides: SubscriptionOverrides): CoachingSubscription {
  return {
    bundle: overrides.bundle ?? 3,
    startPath: overrides.startPath ?? 'immediate',
    purchasedAt: PURCHASED_AT,
    amountPaidCents: overrides.amountPaidCents ?? AMOUNT_PAID_CENTS,
    status: overrides.status ?? 'not-started',
    day1: overrides.day1,
    periodEndsAt: overrides.periodEndsAt,
    paymentProblem: false,
  };
}

describe('resolveDay1', () => {
  it('starts the immediate path the day the program is ready', () => {
    // arrange
    const programReadyAt = new Date(2026, 0, 15, 9);

    // act
    const day1 = resolveDay1({
      purchasedAt: PURCHASED_AT,
      programReadyAt,
      startPath: 'immediate',
    });

    // assert
    expect(day1).toEqual(programReadyAt);
  });

  it('caps the immediate path at fourteen days after the purchase', () => {
    // arrange
    const programReadyAt = new Date(2026, 1, 1, 9);

    // act
    const day1 = resolveDay1({
      purchasedAt: PURCHASED_AT,
      programReadyAt,
      startPath: 'immediate',
    });

    // assert
    expect(day1).toEqual(WITHDRAWAL_DEADLINE);
  });

  it('leaves the immediate path without a day 1 until the program is ready', () => {
    // arrange
    const programReadyAt = null;

    // act
    const day1 = resolveDay1({
      purchasedAt: PURCHASED_AT,
      programReadyAt,
      startPath: 'immediate',
    });

    // assert
    expect(day1).toBeNull();
  });

  it('starts the waiting path the day the program is ready', () => {
    // arrange
    const programReadyAt = new Date(2026, 0, 30, 9);

    // act
    const day1 = resolveDay1({
      purchasedAt: PURCHASED_AT,
      programReadyAt,
      startPath: 'waiting',
    });

    // assert
    expect(day1).toEqual(programReadyAt);
  });

  it('leaves the waiting path without a day 1 until the program is ready', () => {
    // arrange
    const programReadyAt = null;

    // act
    const day1 = resolveDay1({
      purchasedAt: PURCHASED_AT,
      programReadyAt,
      startPath: 'waiting',
    });

    // assert
    expect(day1).toBeNull();
  });
});

describe('starting work on the program', () => {
  it('holds work on a waiting subscription until the withdrawal deadline', () => {
    // arrange
    const waiting = subscription({ startPath: 'waiting' });

    // act
    const workStart = workStartDate(waiting);

    // assert
    expect(workStart).toEqual(WITHDRAWAL_DEADLINE);
  });

  it('gives an immediate subscription no work start date to wait for', () => {
    // arrange
    const immediate = subscription({ startPath: 'immediate' });

    // act
    const workStart = workStartDate(immediate);

    // assert
    expect(workStart).toBeNull();
  });

  it('keeps Eli from starting a waiting program before the deadline', () => {
    // arrange
    const waiting = subscription({ startPath: 'waiting' });

    // act
    const startable = canStartWork(waiting, new Date(2026, 0, 20, 12));

    // assert
    expect(startable).toBe(false);
  });

  it('lets Eli start a waiting program on the deadline', () => {
    // arrange
    const waiting = subscription({ startPath: 'waiting' });

    // act
    const startable = canStartWork(waiting, WITHDRAWAL_DEADLINE);

    // assert
    expect(startable).toBe(true);
  });

  it('never holds work on an immediate program', () => {
    // arrange
    const immediate = subscription({ startPath: 'immediate' });

    // act
    const startable = canStartWork(immediate, PURCHASED_AT);

    // assert
    expect(startable).toBe(true);
  });
});

describe('renewal periods', () => {
  it('ends a period a bundle of calendar months after day 1', () => {
    // arrange
    const day1 = new Date(2026, 0, 24, 12);

    // act
    const ends = periodEnd(day1, 3, 0);

    // assert
    expect(ends).toEqual(new Date(2026, 3, 24, 12));
  });

  it('stacks each further period on the one before it', () => {
    // arrange
    const day1 = new Date(2026, 0, 24, 12);

    // act
    const ends = periodEnd(day1, 3, 1);

    // assert
    expect(ends).toEqual(new Date(2026, 6, 24, 12));
  });

  it('reads the running period after a renewal', () => {
    // arrange
    const running = subscription({
      bundle: 3,
      day1: new Date(2026, 0, 24, 12),
      status: 'active',
    });

    // act
    const period = currentPeriod(running, new Date(2026, 4, 1, 12));

    // assert
    expect(period).toEqual({
      index: 1,
      startsAt: new Date(2026, 3, 24, 12),
      endsAt: new Date(2026, 6, 24, 12),
    });
  });

  it('has no running period before day 1', () => {
    // arrange
    const waiting = subscription({
      startPath: 'waiting',
      day1: WITHDRAWAL_DEADLINE,
    });

    // act
    const period = currentPeriod(waiting, new Date(2026, 0, 20, 12));

    // assert
    expect(period).toBeNull();
  });
});

describe('which cancellation applies', () => {
  it('offers a full refund on the waiting path before the withdrawal deadline', () => {
    // arrange
    const waiting = subscription({ startPath: 'waiting' });

    // act
    const rule = cancellationRule(waiting, new Date(2026, 0, 23, 12));

    // assert
    expect(rule).toBe('full-refund');
  });

  it('offers a proportional refund on the immediate path within 14 days of purchase', () => {
    // arrange
    const immediate = subscription({ startPath: 'immediate' });

    // act
    const rule = cancellationRule(immediate, new Date(2026, 0, 23, 12));

    // assert
    expect(rule).toBe('proportional-refund');
  });

  it('offers no refund on the waiting path once the withdrawal deadline is reached', () => {
    // arrange
    const waiting = subscription({ startPath: 'waiting' });

    // act
    const rule = cancellationRule(waiting, WITHDRAWAL_DEADLINE);

    // assert
    expect(rule).toBe('no-refund');
  });

  it('offers no refund on the immediate path 14 days after the purchase', () => {
    // arrange
    const immediate = subscription({ startPath: 'immediate' });

    // act
    const rule = cancellationRule(immediate, WITHDRAWAL_DEADLINE);

    // assert
    expect(rule).toBe('no-refund');
  });

  it('offers no refund on a running subscription past the withdrawal deadline', () => {
    // arrange
    const running = subscription({
      day1: new Date(2026, 0, 15, 12),
      status: 'active',
    });

    // act
    const rule = cancellationRule(running, new Date(2026, 1, 1, 12));

    // assert
    expect(rule).toBe('no-refund');
  });

  it('offers nothing once the subscription is cancelled', () => {
    // arrange
    const cancelled = subscription({
      status: 'cancelled',
      periodEndsAt: new Date(2026, 3, 10, 12),
    });

    // act
    const rule = cancellationRule(cancelled, new Date(2026, 1, 1, 12));

    // assert
    expect(rule).toBe('none');
  });

  it('offers nothing once the subscription has ended', () => {
    // arrange
    const ended = subscription({ status: 'ended' });

    // act
    const rule = cancellationRule(ended, new Date(2026, 0, 12, 12));

    // assert
    expect(rule).toBe('none');
  });

  it('turns the waiting full refund into the proportional refund after starting now', () => {
    // arrange
    const started = startNow(subscription({ startPath: 'waiting' }));

    // act
    const rule = cancellationRule(started, new Date(2026, 0, 20, 12));

    // assert
    expect(rule).toBe('proportional-refund');
  });
});

describe('the proportional refund', () => {
  it('refunds everything before day 1', () => {
    // arrange
    const immediate = subscription({ startPath: 'immediate' });

    // act
    const refund = proportionalRefundCents(
      immediate,
      new Date(2026, 0, 12, 12),
    );

    // assert
    expect(refund).toBe(AMOUNT_PAID_CENTS);
  });

  it('refunds everything while day 1 is still ahead', () => {
    // arrange
    const immediate = subscription({ day1: new Date(2026, 0, 15, 12) });

    // act
    const refund = proportionalRefundCents(
      immediate,
      new Date(2026, 0, 14, 12),
    );

    // assert
    expect(refund).toBe(AMOUNT_PAID_CENTS);
  });

  it('refunds the unused whole days of the first period, day 1 counted as used', () => {
    // arrange
    const running = subscription({
      bundle: 1,
      amountPaidCents: 15900,
      day1: new Date(2026, 0, 15, 12),
      status: 'active',
    });

    // act
    const refund = proportionalRefundCents(running, new Date(2026, 0, 20, 9));

    // assert
    expect(refund).toBe(Math.round((15900 * 25) / 31));
  });

  it('rounds the unused share to the nearest cent', () => {
    // arrange
    const running = subscription({
      bundle: 3,
      amountPaidCents: 44700,
      day1: new Date(2026, 0, 12, 12),
      status: 'active',
    });

    // act
    const refund = proportionalRefundCents(running, new Date(2026, 0, 12, 18));

    // assert
    expect(refund).toBe(44203);
  });
});

describe('cancelling', () => {
  it('ends a waiting subscription at once with the amount paid due back', () => {
    // arrange
    const waiting = subscription({ startPath: 'waiting' });
    const now = new Date(2026, 0, 20, 12);

    // act
    const cancelled = cancel(waiting, now);

    // assert
    expect(cancelled).toEqual({
      ...waiting,
      status: 'ended',
      cancelledAt: now,
      periodEndsAt: now,
      refund: {
        amountCents: AMOUNT_PAID_CENTS,
        reason: 'full-refund',
        dueBy: new Date(2026, 1, 3, 12),
        refundedCents: 0,
      },
    });
  });

  it('ends an immediate subscription at once with the proportional refund due', () => {
    // arrange
    const running = subscription({
      bundle: 1,
      amountPaidCents: 15900,
      day1: new Date(2026, 0, 15, 12),
      status: 'active',
    });
    const now = new Date(2026, 0, 20, 12);

    // act
    const cancelled = cancel(running, now);

    // assert
    expect(cancelled.status).toBe('ended');
    expect(cancelled.periodEndsAt).toEqual(now);
    expect(cancelled.refund).toEqual({
      amountCents: Math.round((15900 * 25) / 31),
      reason: 'proportional-refund',
      dueBy: new Date(2026, 1, 3, 12),
      refundedCents: 0,
    });
  });

  it('keeps access until the bundle runs out when cancelled without a refund before day 1', () => {
    // arrange
    const waiting = subscription({ startPath: 'waiting' });
    const now = new Date(2026, 0, 30, 12);

    // act
    const cancelled = cancel(waiting, now);

    // assert
    expect(cancelled).toEqual({
      ...waiting,
      status: 'cancelled',
      cancelledAt: now,
      periodEndsAt: new Date(2026, 3, 10, 12),
    });
  });

  it('keeps access until the period ends when cancelled after day 1', () => {
    // arrange
    const running = subscription({
      bundle: 1,
      startPath: 'waiting',
      day1: WITHDRAWAL_DEADLINE,
      status: 'active',
    });
    const now = new Date(2026, 1, 1, 12);

    // act
    const cancelled = cancel(running, now);

    // assert
    expect(cancelled).toEqual({
      ...running,
      status: 'cancelled',
      cancelledAt: now,
      periodEndsAt: new Date(2026, 1, 24, 12),
    });
  });

  it('leaves a cancelled subscription as it is', () => {
    // arrange
    const cancelled = subscription({
      status: 'cancelled',
      periodEndsAt: new Date(2026, 3, 10, 12),
    });

    // act
    const again = cancel(cancelled, new Date(2026, 1, 1, 12));

    // assert
    expect(again).toBe(cancelled);
  });
});

describe('ending from the payment provider', () => {
  it('ends the subscription at the given instant without a refund', () => {
    // arrange
    const running = subscription({});
    const endedAt = new Date(2026, 0, 20, 12);

    // act
    const ended = endSubscription(running, endedAt);

    // assert
    expect(deriveStatus(ended, endedAt)).toBe('ended');
    expect(ended.periodEndsAt).toEqual(endedAt);
    expect(needsRefund(ended)).toBe(false);
  });
});

describe('settling a refund', () => {
  const ended = cancel(
    subscription({ startPath: 'waiting' }),
    new Date(2026, 0, 20, 12),
  );

  it('reduces what is still due after a partial refund', () => {
    // arrange
    const settlement = { refundedCents: 20000, at: new Date(2026, 0, 22, 9) };

    // act
    const settled = settleRefund(ended, settlement);

    // assert
    expect(outstandingRefundCents(settled)).toBe(AMOUNT_PAID_CENTS - 20000);
    expect(needsRefund(settled)).toBe(true);
    expect(settled.refund?.refundedAt).toBeUndefined();
  });

  it('records the refund date once the whole amount is refunded', () => {
    // arrange
    const at = new Date(2026, 0, 22, 9);

    // act
    const settled = settleRefund(ended, {
      refundedCents: AMOUNT_PAID_CENTS,
      at,
    });

    // assert
    expect(outstandingRefundCents(settled)).toBe(0);
    expect(needsRefund(settled)).toBe(false);
    expect(settled.refund?.refundedAt).toEqual(at);
  });

  it('leaves a subscription with no refund due untouched', () => {
    // arrange
    const running = subscription({});

    // act
    const settled = settleRefund(running, {
      refundedCents: 1000,
      at: new Date(2026, 0, 22, 9),
    });

    // assert
    expect(settled).toBe(running);
    expect(needsRefund(settled)).toBe(false);
  });
});

describe('starting now', () => {
  it('moves a waiting subscription onto the immediate path', () => {
    // arrange
    const waiting = subscription({
      startPath: 'waiting',
      day1: WITHDRAWAL_DEADLINE,
    });

    // act
    const started = startNow(waiting);

    // assert
    expect(started).toEqual({
      ...waiting,
      startPath: 'immediate',
      day1: undefined,
    });
  });

  it('leaves an immediate subscription alone', () => {
    // arrange
    const immediate = subscription({ startPath: 'immediate' });

    // act
    const started = startNow(immediate);

    // assert
    expect(started).toBe(immediate);
  });
});

describe('deriveStatus', () => {
  it('waits while day 1 is unknown', () => {
    // arrange
    const bought = subscription({});

    // act
    const status = deriveStatus(bought, new Date(2026, 0, 11, 12));

    // assert
    expect(status).toBe('not-started');
  });

  it('waits while day 1 is still ahead', () => {
    // arrange
    const waiting = subscription({
      startPath: 'waiting',
      day1: WITHDRAWAL_DEADLINE,
    });

    // act
    const status = deriveStatus(waiting, new Date(2026, 0, 20, 12));

    // assert
    expect(status).toBe('not-started');
  });

  it('turns active on day 1', () => {
    // arrange
    const waiting = subscription({
      startPath: 'waiting',
      day1: WITHDRAWAL_DEADLINE,
    });

    // act
    const status = deriveStatus(waiting, WITHDRAWAL_DEADLINE);

    // assert
    expect(status).toBe('active');
  });

  it('keeps a cancelled subscription cancelled until its period ends', () => {
    // arrange
    const cancelled = subscription({
      status: 'cancelled',
      day1: new Date(2026, 0, 15, 12),
      periodEndsAt: new Date(2026, 1, 15, 12),
    });

    // act
    const status = deriveStatus(cancelled, new Date(2026, 1, 1, 12));

    // assert
    expect(status).toBe('cancelled');
  });

  it('ends a cancelled subscription once its period is over', () => {
    // arrange
    const cancelled = subscription({
      status: 'cancelled',
      day1: new Date(2026, 0, 15, 12),
      periodEndsAt: new Date(2026, 1, 15, 12),
    });

    // act
    const status = deriveStatus(cancelled, new Date(2026, 1, 16, 12));

    // assert
    expect(status).toBe('ended');
  });

  it('leaves an ended subscription ended', () => {
    // arrange
    const ended = subscription({ status: 'ended' });

    // act
    const status = deriveStatus(ended, new Date(2026, 2, 1, 12));

    // assert
    expect(status).toBe('ended');
  });
});
