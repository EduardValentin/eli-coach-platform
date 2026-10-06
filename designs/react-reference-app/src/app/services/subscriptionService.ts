import {
  cancel,
  cancellationRule,
  startNow,
  type CardOnFile,
  type CoachingSubscription,
} from '../domain/coachingSubscription';
import { TEST_VISA_DEBIT } from './prototypeCards';

export type PrototypeCancelOutcome = 'works' | 'fails';

export const PROTOTYPE_CANCEL_OUTCOMES: readonly PrototypeCancelOutcome[] = [
  'works',
  'fails',
];

export type PrototypeStartNowOutcome = 'works' | 'fails';

export const PROTOTYPE_START_NOW_OUTCOMES: readonly PrototypeStartNowOutcome[] =
  ['works', 'fails'];

export type PrototypePaymentPortalOutcome = 'works' | 'fails';

export const PROTOTYPE_PAYMENT_PORTAL_OUTCOMES: readonly PrototypePaymentPortalOutcome[] =
  ['works', 'fails'];

export type SubscriptionErrorCode =
  | 'already-ended'
  | 'cancel-unavailable'
  | 'start-now-unavailable'
  | 'payment-portal-unavailable';

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
  'cancel-unavailable':
    "Your coaching couldn't be cancelled just now. Nothing has changed, so please try again.",
  'start-now-unavailable':
    "Your program couldn't be started just now. Nothing has changed, so please try again.",
  'payment-portal-unavailable':
    "Your payment details couldn't be opened just now. Please try again.",
};

export function subscriptionErrorMessage(
  error: unknown,
  fallbackCode: SubscriptionErrorCode,
): string {
  return error instanceof SubscriptionError
    ? error.message
    : SUBSCRIPTION_ERROR_MESSAGES[fallbackCode];
}

export const PAYMENT_METHOD_PORTAL_PATH = '/billing/payment-method';

export type PaymentMethodSession = { url: string };

export const SIMULATED_LATENCY_MS = 900;

function simulatedLatency(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, SIMULATED_LATENCY_MS));
}

function subscriptionError(code: SubscriptionErrorCode): SubscriptionError {
  return new SubscriptionError(code, SUBSCRIPTION_ERROR_MESSAGES[code]);
}

export async function cancelSubscription(
  subscription: CoachingSubscription,
  now: Date,
  outcome: PrototypeCancelOutcome,
): Promise<CoachingSubscription> {
  await simulatedLatency();

  if (outcome === 'fails') throw subscriptionError('cancel-unavailable');

  if (cancellationRule(subscription, now) === 'none') {
    throw subscriptionError('already-ended');
  }

  return cancel(subscription, now);
}

export async function startSubscriptionNow(
  subscription: CoachingSubscription,
  outcome: PrototypeStartNowOutcome,
): Promise<CoachingSubscription> {
  await simulatedLatency();

  if (outcome === 'fails') throw subscriptionError('start-now-unavailable');

  return startNow(subscription);
}

export async function openPaymentMethodPortal(
  outcome: PrototypePaymentPortalOutcome,
): Promise<PaymentMethodSession> {
  await simulatedLatency();

  if (outcome === 'fails') throw subscriptionError('payment-portal-unavailable');

  return { url: PAYMENT_METHOD_PORTAL_PATH };
}

export async function savePaymentMethod(): Promise<CardOnFile> {
  await simulatedLatency();

  return TEST_VISA_DEBIT;
}
