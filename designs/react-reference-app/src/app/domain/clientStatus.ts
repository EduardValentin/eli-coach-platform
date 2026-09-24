import {
  deriveStatus,
  type CoachingSubscription,
} from './coachingSubscription';
import type { ClientJourney, JourneyStage } from './journey';

export type ClientStatusLabel =
  | 'Call held'
  | 'Payment link sent'
  | 'Invited'
  | 'Onboarding'
  | 'Awaiting review'
  | 'In review'
  | 'Needs details'
  | 'Approved'
  | 'Active'
  | 'Cancelled'
  | 'Inactive';

export type ClientStatusTone =
  | 'neutral'
  | 'pending'
  | 'info'
  | 'success'
  | 'muted';

export type ClientStatus = {
  label: ClientStatusLabel;
  tone: ClientStatusTone;
};

const STATUS_TONES: Record<ClientStatusLabel, ClientStatusTone> = {
  'Call held': 'neutral',
  'Payment link sent': 'neutral',
  Invited: 'neutral',
  Onboarding: 'neutral',
  'Awaiting review': 'pending',
  'In review': 'info',
  'Needs details': 'pending',
  Approved: 'info',
  Active: 'success',
  Cancelled: 'muted',
  Inactive: 'muted',
};

const STAGE_STATUS_LABELS: Record<JourneyStage, ClientStatusLabel> = {
  held: 'Call held',
  'payment-link-sent': 'Payment link sent',
  invited: 'Invited',
  'account-created': 'Onboarding',
  onboarding: 'Onboarding',
  submitted: 'Awaiting review',
  reviewing: 'In review',
  'needs-details': 'Needs details',
  approved: 'Approved',
  'program-ready': 'Active',
  'review-call-scheduled': 'Active',
};

export const ONBOARDING_STATUS_LABELS: readonly ClientStatusLabel[] = [
  'Invited',
  'Onboarding',
  'Awaiting review',
  'In review',
  'Needs details',
  'Approved',
];

export function clientStatusNamed(label: ClientStatusLabel): ClientStatus {
  return { label, tone: STATUS_TONES[label] };
}

function closedSubscriptionLabel(
  subscription: CoachingSubscription,
  now: Date,
): ClientStatusLabel | null {
  const status = deriveStatus(subscription, now);

  if (status === 'cancelled') return 'Cancelled';
  if (status === 'ended') return 'Inactive';

  return null;
}

export function clientStatus(journey: ClientJourney, now: Date): ClientStatus {
  const closed = journey.subscription
    ? closedSubscriptionLabel(journey.subscription, now)
    : null;

  return clientStatusNamed(closed ?? STAGE_STATUS_LABELS[journey.stage]);
}
