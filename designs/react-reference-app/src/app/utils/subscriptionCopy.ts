import {
  accessEndWithoutRefund,
  withdrawalDeadline,
  type CancellationRule,
  type CoachingSubscription,
  type RefundReason,
} from '../domain/coachingSubscription';
import { formatJourneyDate } from './journeyLabels';

export type OfferedCancellation = Exclude<CancellationRule, 'none'>;

export const CANCEL_ACTION_LABELS: Record<OfferedCancellation, string> = {
  'full-refund': 'Cancel and get a full refund',
  'no-refund': 'Cancel subscription',
};

export const CANCEL_ROW_ACTION_LABEL = 'Cancel';

export const CHANGE_ROW_ACTION_LABEL = 'Change';

export const KEEP_COACHING_LABEL = 'Keep my coaching';

export const CANCELLING_LABEL = 'Cancelling…';

export const OPENING_PAYMENT_METHOD_LABEL = 'Opening…';

export const PAYMENT_PROBLEM_LINE =
  "Your last payment didn't go through. Update your card to keep your coaching going.";

export const COACHING_ENDED_TITLE = 'Your coaching has ended';

export const COACHING_ENDED_LINE = 'It was good to train together.';

export const REFUND_ON_ITS_WAY_LINE =
  'Eli will refund you in the next few days; it reaches your card within 5–10 business days.';

export const REFUND_REASON_LABELS: Record<RefundReason, string> = {
  'full-refund': 'Full refund: cancelled within the 14-day withdrawal period.',
  'coach-issued': 'Refund issued from the payments dashboard.',
};

export function cancellationFacts(
  rule: OfferedCancellation,
  subscription: CoachingSubscription,
  now: Date,
): string {
  if (rule === 'full-refund') {
    const deadline = formatJourneyDate(
      withdrawalDeadline(subscription.purchasedAt),
    );

    return `Until ${deadline} you can cancel for a full refund. Your access ends right away.`;
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

  return noRefundFacts(accessEndWithoutRefund(subscription, now));
}

export function cancelledToast(accessEndsAt: Date): string {
  return `Subscription cancelled. Your access stays until ${formatJourneyDate(accessEndsAt)}.`;
}
