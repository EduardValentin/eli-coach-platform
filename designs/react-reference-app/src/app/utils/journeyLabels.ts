import { format } from 'date-fns';
import { bundleLengthLabel } from '../domain/bundles';
import { DEMO_JOURNEY_CALL_ID } from '../context/ClientJourneyContext';
import type {
  ClientJourney,
  JourneyGender,
  JourneyPricing,
} from '../domain/journey';
import {
  workStartDate,
  type CoachingSubscription,
  type SubscriptionStatus,
} from '../domain/coachingSubscription';

const DEMO_CLIENT_IDS: readonly string[] = ['c1', 'client-1'];

export const IMMEDIATE_START_LABEL = 'Immediate start';

export const PRICING_LABELS: Record<JourneyPricing, string> = {
  reduced: 'Reduced (waitlist)',
  regular: 'Regular',
};

export const PRICING_TIER_LABELS: Record<JourneyPricing, string> = {
  reduced: 'Reduced',
  regular: 'Regular',
};

export const GENDER_LABELS: Record<JourneyGender, string> = {
  female: 'Female',
  male: 'Male',
  'prefer-not-to-say': 'Prefer not to say',
};

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  'not-started': 'Not started yet',
  active: 'Active',
  cancelled: 'Cancelled',
  ended: 'Ended',
};

export function formatJourneyDate(instant: Date): string {
  return format(instant, 'd MMMM');
}

export function journeyCallIdForClient(clientId: string): string | null {
  return DEMO_CLIENT_IDS.includes(clientId) ? DEMO_JOURNEY_CALL_ID : null;
}

export function clientDetailPathForJourney(journey: ClientJourney): string {
  return journey.callId === DEMO_JOURNEY_CALL_ID
    ? '/coach/clients/c1'
    : `/coach/clients/${journey.callId}`;
}

export function startPathLabel(
  subscription: CoachingSubscription | undefined,
): string | null {
  if (!subscription) return null;

  const workStart = workStartDate(subscription);

  return workStart
    ? `After the 14 days (${formatJourneyDate(workStart)})`
    : IMMEDIATE_START_LABEL;
}

export { bundleLengthLabel };
