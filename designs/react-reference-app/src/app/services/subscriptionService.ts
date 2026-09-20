import {
  cancel,
  startNow,
  type CoachingSubscription,
  type SubscriptionCancellation,
} from '../domain/coachingSubscription';

export type SubscriptionErrorCode = 'already-ended';

export class SubscriptionError extends Error {
  code: SubscriptionErrorCode;

  constructor(code: SubscriptionErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'SubscriptionError';
  }
}

export const SUBSCRIPTION_ERROR_MESSAGES: Record<
  SubscriptionErrorCode,
  string
> = {
  'already-ended': 'This coaching has already ended, so there is nothing to cancel.',
};

export const SIMULATED_LATENCY_MS = 900;

export async function cancelSubscription(
  subscription: CoachingSubscription,
  now: Date,
): Promise<SubscriptionCancellation> {
  await new Promise((resolve) => setTimeout(resolve, SIMULATED_LATENCY_MS));

  if (subscription.status === 'ended') {
    throw new SubscriptionError(
      'already-ended',
      SUBSCRIPTION_ERROR_MESSAGES['already-ended'],
    );
  }

  return cancel(subscription, now);
}

export async function startSubscriptionNow(
  subscription: CoachingSubscription,
): Promise<CoachingSubscription> {
  await new Promise((resolve) => setTimeout(resolve, SIMULATED_LATENCY_MS));

  return startNow(subscription);
}
