import { describe, expect, it } from 'vitest';
import {
  cancel,
  canStartWork,
  currentPeriod,
  deriveStatus,
  periodEnd,
  resolveDay1,
  startNow,
  type CoachingSubscription,
  type SubscriptionBundle,
  type SubscriptionStartPath,
  workStartDate,
} from './coachingSubscription';

const PURCHASED_AT = new Date(2026, 0, 10, 12);
const WITHDRAWAL_DEADLINE = new Date(2026, 0, 24, 12);

type SubscriptionOverrides = {
  bundle?: SubscriptionBundle;
  startPath?: SubscriptionStartPath;
  day1?: Date;
  periodEndsAt?: Date;
  status?: CoachingSubscription['status'];
};

function subscription(overrides: SubscriptionOverrides): CoachingSubscription {
  return {
    bundle: overrides.bundle ?? 3,
    startPath: overrides.startPath ?? 'immediate',
    purchasedAt: PURCHASED_AT,
    status: overrides.status ?? 'not-started',
    day1: overrides.day1,
    periodEndsAt: overrides.periodEndsAt,
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

describe('cancelling', () => {
  it('refunds a waiting subscription cancelled before the withdrawal deadline', () => {
    // arrange
    const waiting = subscription({ startPath: 'waiting' });
    const now = new Date(2026, 0, 20, 12);

    // act
    const cancellation = cancel(waiting, now);

    // assert
    expect(cancellation).toEqual({
      subscription: {
        ...waiting,
        status: 'ended',
        cancelledAt: now,
        periodEndsAt: now,
      },
      fullRefund: true,
    });
  });

  it('keeps access until the period ends when cancelled after day 1', () => {
    // arrange
    const running = subscription({
      bundle: 1,
      day1: new Date(2026, 0, 15, 12),
      status: 'active',
    });
    const now = new Date(2026, 0, 20, 12);

    // act
    const cancellation = cancel(running, now);

    // assert
    expect(cancellation).toEqual({
      subscription: {
        ...running,
        status: 'cancelled',
        cancelledAt: now,
        periodEndsAt: new Date(2026, 1, 15, 12),
      },
      fullRefund: false,
    });
  });

  it('refuses a refund once a waiting subscription has started', () => {
    // arrange
    const running = subscription({
      bundle: 1,
      startPath: 'waiting',
      day1: WITHDRAWAL_DEADLINE,
      status: 'active',
    });

    // act
    const cancellation = cancel(running, new Date(2026, 1, 1, 12));

    // assert
    expect(cancellation.fullRefund).toBe(false);
    expect(cancellation.subscription.periodEndsAt).toEqual(
      new Date(2026, 1, 24, 12),
    );
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
