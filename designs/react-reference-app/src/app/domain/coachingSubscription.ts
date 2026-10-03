import { addDays, addMonths } from 'date-fns';

export type SubscriptionBundle = 1 | 3 | 6;

export type SubscriptionStartPath = 'immediate' | 'waiting';

export type SubscriptionStatus =
  | 'not-started'
  | 'active'
  | 'cancelled'
  | 'ended';

export const SUBSCRIPTION_BUNDLES: readonly SubscriptionBundle[] = [1, 3, 6];

const SUBSCRIPTION_START_PATHS: readonly SubscriptionStartPath[] = [
  'immediate',
  'waiting',
];

export function parseStartPath(
  value: string | null,
): SubscriptionStartPath | undefined {
  return SUBSCRIPTION_START_PATHS.find((startPath) => startPath === value);
}

export const WITHDRAWAL_WINDOW_DAYS = 14;

export const REFUND_DUE_WITHIN_DAYS = 14;

export type RefundReason = 'full-refund' | 'coach-issued';

export type RefundDue = {
  amountCents: number;
  reason: RefundReason;
  dueBy: Date;
  refundedCents: number;
  refundedAt?: Date;
};

export type CancellationRule = 'full-refund' | 'no-refund' | 'none';

export type CoachingSubscription = {
  bundle: SubscriptionBundle;
  startPath: SubscriptionStartPath;
  purchasedAt: Date;
  amountPaidCents: number;
  status: SubscriptionStatus;
  day1?: Date;
  periodEndsAt?: Date;
  cancelledAt?: Date;
  refund?: RefundDue;
  paymentProblem: boolean;
};

export type RefundSettlement = {
  refundedCents: number;
  at: Date;
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

export function withdrawalDeadline(purchasedAt: Date): Date {
  return addDays(purchasedAt, WITHDRAWAL_WINDOW_DAYS);
}

export function resolveDay1({
  purchasedAt,
  programReadyAt,
  startPath,
}: Day1Request): Date | null {
  if (programReadyAt === null) return null;
  if (startPath === 'waiting') return programReadyAt;

  const deadline = withdrawalDeadline(purchasedAt);

  return programReadyAt.getTime() < deadline.getTime()
    ? programReadyAt
    : deadline;
}

export function workStartDate(subscription: CoachingSubscription): Date | null {
  if (subscription.startPath !== 'waiting') return null;

  return withdrawalDeadline(subscription.purchasedAt);
}

export function canStartWork(
  subscription: CoachingSubscription,
  now: Date,
): boolean {
  const workStart = workStartDate(subscription);
  if (workStart === null) return true;

  return now.getTime() >= workStart.getTime();
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

export function cancellationRule(
  subscription: CoachingSubscription,
  now: Date,
): CancellationRule {
  const status = deriveStatus(subscription, now);
  if (status === 'cancelled' || status === 'ended') return 'none';

  const withinWithdrawal =
    now.getTime() < withdrawalDeadline(subscription.purchasedAt).getTime();
  const keepsWithdrawalRight = subscription.startPath === 'waiting';

  return withinWithdrawal && keepsWithdrawalRight ? 'full-refund' : 'no-refund';
}

export function accessEndWithoutRefund(
  subscription: CoachingSubscription,
  now: Date,
): Date {
  const period = currentPeriod(subscription, now);
  if (period) return period.endsAt;

  return addMonths(subscription.purchasedAt, subscription.bundle);
}

export function cancel(
  subscription: CoachingSubscription,
  now: Date,
): CoachingSubscription {
  const rule = cancellationRule(subscription, now);
  if (rule === 'none') return subscription;

  if (rule === 'no-refund') {
    return {
      ...subscription,
      status: 'cancelled',
      cancelledAt: now,
      periodEndsAt: accessEndWithoutRefund(subscription, now),
    };
  }

  return {
    ...subscription,
    status: 'ended',
    cancelledAt: now,
    periodEndsAt: now,
    refund: {
      amountCents: subscription.amountPaidCents,
      reason: 'full-refund',
      dueBy: addDays(now, REFUND_DUE_WITHIN_DAYS),
      refundedCents: 0,
    },
  };
}

export function outstandingRefundCents(
  subscription: CoachingSubscription,
): number {
  const { refund } = subscription;
  if (!refund) return 0;

  return Math.max(0, refund.amountCents - refund.refundedCents);
}

export function needsRefund(
  subscription: CoachingSubscription | undefined,
): boolean {
  return subscription ? outstandingRefundCents(subscription) > 0 : false;
}

function withCoachIssuedRefund(
  subscription: CoachingSubscription,
  settlement: RefundSettlement,
): CoachingSubscription {
  return {
    ...subscription,
    refund: {
      amountCents: settlement.refundedCents,
      reason: 'coach-issued',
      dueBy: settlement.at,
      refundedCents: settlement.refundedCents,
      refundedAt: settlement.at,
    },
  };
}

export function settleRefund(
  subscription: CoachingSubscription,
  settlement: RefundSettlement,
): CoachingSubscription {
  const { refund } = subscription;
  if (!refund) return withCoachIssuedRefund(subscription, settlement);

  const settled = settlement.refundedCents >= refund.amountCents;

  return {
    ...subscription,
    refund: {
      ...refund,
      refundedCents: settlement.refundedCents,
      refundedAt: settled ? settlement.at : undefined,
    },
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
