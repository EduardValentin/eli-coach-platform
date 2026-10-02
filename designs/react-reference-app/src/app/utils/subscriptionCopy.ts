import {
  accessEndWithoutRefund,
  proportionalRefundCents,
  withdrawalDeadline,
  type CancellationRule,
  type CoachingSubscription,
  type RefundReason,
} from '../domain/coachingSubscription';
import { formatJourneyDate } from './journeyLabels';
import { formatEuroCents } from './money';

export type OfferedCancellation = Exclude<CancellationRule, 'none'>;

export const CANCEL_ACTION_LABELS: Record<OfferedCancellation, string> = {
  'full-refund': 'Cancel and get a full refund',
  'proportional-refund': 'Cancel and get a refund',
  'no-refund': 'Cancel subscription',
};

export const KEEP_COACHING_LABEL = 'Keep my coaching';

export const CANCELLING_LABEL = 'Cancelling…';

export const DONE_LABEL = 'Done';

export const MANAGE_PAYMENT_METHOD_LABEL = 'Manage payment method';

export const OPENING_PAYMENT_METHOD_LABEL = 'Opening…';

export const PAYMENT_METHOD_LINE = 'The card your coaching renews on.';

export const PAYMENT_PROBLEM_TITLE = 'Payment problem';

export const PAYMENT_PROBLEM_LINE =
  "Your last payment didn't go through. Update your card to keep your coaching going.";

export const COACHING_ENDED_TITLE = 'Your coaching has ended';

export const COACHING_ENDED_LINE = 'It was good to train together.';

export const REFUND_ON_ITS_WAY_LINE =
  'Eli will refund you in the next few days; it reaches your card within 5–10 business days.';

export const REFUND_REASON_LABELS: Record<RefundReason, string> = {
  'full-refund': 'Full refund: cancelled within the 14-day withdrawal period.',
  'proportional-refund':
    'Proportional refund: cancelled within 14 days of paying, for the unused part of the first term.',
};

export function cancellationFacts(
  rule: OfferedCancellation,
  subscription: CoachingSubscription,
  now: Date,
): string {
  const deadline = formatJourneyDate(withdrawalDeadline(subscription.purchasedAt));

  if (rule === 'full-refund') {
    return `Until ${deadline} you can cancel for a full refund. Your access ends right away.`;
  }
  if (rule === 'proportional-refund') {
    return `Until ${deadline} you can cancel for a refund: all of it before your program starts, or the unused part of your first term once it has. Your access ends right away.`;
  }

  return noRefundFacts(accessEndWithoutRefund(subscription, now));
}

function noRefundFacts(accessEndsAt: Date): string {
  return `You won't be charged again, there is no refund for the coaching already paid, and your access stays until ${formatJourneyDate(accessEndsAt)}.`;
}

export function cancelConfirmation(
  rule: OfferedCancellation,
  subscription: CoachingSubscription,
  now: Date,
): string {
  if (rule === 'full-refund') {
    return "You'll get a full refund and your access ends right away.";
  }
  if (rule === 'proportional-refund') {
    const refund = formatEuroCents(proportionalRefundCents(subscription, now));

    return `You'll get ${refund} back and your access ends right away.`;
  }

  return noRefundFacts(accessEndWithoutRefund(subscription, now));
}

export function cancelledToast(accessEndsAt: Date): string {
  return `Subscription cancelled. Your access stays until ${formatJourneyDate(accessEndsAt)}.`;
}
