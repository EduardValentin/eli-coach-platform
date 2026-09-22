import { addDays, addMonths } from 'date-fns';

export type SubscriptionBundle = 1 | 3 | 6;

export type SubscriptionStartPath = 'immediate' | 'waiting';

export type SubscriptionStatus =
  | 'not-started'
  | 'active'
  | 'cancelled'
  | 'ended';

export const SUBSCRIPTION_BUNDLES: readonly SubscriptionBundle[] = [1, 3, 6];

export const WITHDRAWAL_WINDOW_DAYS = 14;

export type CoachingSubscription = {
  bundle: SubscriptionBundle;
  startPath: SubscriptionStartPath;
  purchasedAt: Date;
  status: SubscriptionStatus;
  day1?: Date;
  periodEndsAt?: Date;
  cancelledAt?: Date;
};

export type Day1Request = {
  purchasedAt: Date;
  programReadyAt: Date | null;
  startPath: SubscriptionStartPath;
};

export type SubscriptionPeriod = {
  index: number;
  startsAt: Date;
  endsAt: Date;
};

export type SubscriptionCancellation = {
  subscription: CoachingSubscription;
  fullRefund: boolean;
};

export function withdrawalDeadline(purchasedAt: Date): Date {
  return addDays(purchasedAt, WITHDRAWAL_WINDOW_DAYS);
}

export function resolveDay1({
  purchasedAt,
  programReadyAt,
  startPath,
}: Day1Request): Date | null {
  const deadline = withdrawalDeadline(purchasedAt);

  if (startPath === 'waiting') return deadline;
  if (programReadyAt === null) return null;

  return programReadyAt.getTime() < deadline.getTime()
    ? programReadyAt
    : deadline;
}

export function deliveryDate(subscription: CoachingSubscription): Date | null {
  if (subscription.startPath !== 'waiting') return null;

  return withdrawalDeadline(subscription.purchasedAt);
}

export function canDeliverProgram(
  subscription: CoachingSubscription,
  now: Date,
): boolean {
  const delivery = deliveryDate(subscription);
  if (delivery === null) return true;

  return now.getTime() >= delivery.getTime();
}

export function periodEnd(
  day1: Date,
  bundle: SubscriptionBundle,
  periodIndex: number,
): Date {
  return addMonths(day1, bundle * (periodIndex + 1));
}

export function currentPeriod(
  subscription: CoachingSubscription,
  now: Date,
): SubscriptionPeriod | null {
  const { day1, bundle } = subscription;
  if (!day1 || now.getTime() < day1.getTime()) return null;

  let index = 0;
  let startsAt = day1;
  let endsAt = periodEnd(day1, bundle, index);

  while (now.getTime() >= endsAt.getTime()) {
    index += 1;
    startsAt = endsAt;
    endsAt = periodEnd(day1, bundle, index);
  }

  return { index, startsAt, endsAt };
}

export function cancel(
  subscription: CoachingSubscription,
  now: Date,
): SubscriptionCancellation {
  if (!canDeliverProgram(subscription, now)) {
    return {
      subscription: {
        ...subscription,
        status: 'ended',
        cancelledAt: now,
        periodEndsAt: now,
      },
      fullRefund: true,
    };
  }

  const period = currentPeriod(subscription, now);
  const endsAt = period
    ? period.endsAt
    : periodEnd(
        subscription.day1 ?? subscription.purchasedAt,
        subscription.bundle,
        0,
      );

  return {
    subscription: {
      ...subscription,
      status: 'cancelled',
      cancelledAt: now,
      periodEndsAt: endsAt,
    },
    fullRefund: false,
  };
}

export function startNow(
  subscription: CoachingSubscription,
): CoachingSubscription {
  if (subscription.startPath === 'immediate') return subscription;

  return { ...subscription, startPath: 'immediate', day1: undefined };
}

export function deriveStatus(
  subscription: CoachingSubscription,
  now: Date,
): SubscriptionStatus {
  const { status, day1, periodEndsAt } = subscription;

  if (status === 'ended') return 'ended';

  if (status === 'cancelled') {
    return periodEndsAt && now.getTime() >= periodEndsAt.getTime()
      ? 'ended'
      : 'cancelled';
  }

  return day1 && now.getTime() >= day1.getTime() ? 'active' : 'not-started';
}
