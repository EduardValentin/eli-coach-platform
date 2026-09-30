import { format } from 'date-fns';
import { bundleLengthLabel } from '../domain/bundles';
import {
  labelForGender,
  objectPronoun,
  possessivePronoun,
  subjectPronoun,
  type PossessivePronoun,
  type SubjectPronoun,
  type VisitorGender,
} from '../services/visitorProfile';
import { DEMO_JOURNEY_CALL_ID } from '../context/ClientJourneyContext';
import type {
  ClientJourney,
  JourneyGender,
  JourneyPricing,
} from '../domain/journey';
import { CYCLE_MODE_LABELS } from '../domain/cycleMode';
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

export const REDUCED_PRICE_LABELS: Record<JourneyPricing, string> = {
  reduced: 'Yes',
  regular: 'No',
};

const VISITOR_GENDER_OF: Record<JourneyGender, VisitorGender> = {
  female: 'female',
  male: 'male',
  'prefer-not-to-say': 'prefer_not_to_say',
};

export function journeyGenderLabel(gender: JourneyGender): string {
  return labelForGender(VISITOR_GENDER_OF[gender]);
}

type ClientPronouns = {
  subject: SubjectPronoun;
  object: string;
  possessive: PossessivePronoun;
};

export function clientPronouns(gender: JourneyGender): ClientPronouns {
  const visitorGender = VISITOR_GENDER_OF[gender];

  return {
    subject: subjectPronoun(visitorGender),
    object: objectPronoun(visitorGender),
    possessive: possessivePronoun(visitorGender),
  };
}

export const CYCLE_MODE_NOT_ANSWERED = 'Not answered yet';

export const CYCLE_MODE_INFO_LABEL = 'What cycle mode means';

export type CycleModeDefinition = { term: string; meaning: string };

export const CYCLE_MODE_DEFINITIONS: readonly CycleModeDefinition[] = [
  {
    term: CYCLE_MODE_LABELS['phase-based'],
    meaning:
      'her program follows her cycle phases: she gets a period, is not on the combined pill, is not pregnant, postpartum or breastfeeding, and is not in perimenopause or menopause.',
  },
  {
    term: CYCLE_MODE_LABELS['symptom-based'],
    meaning:
      'one of those does not hold, so her program follows the symptoms she reports.',
  },
  {
    term: CYCLE_MODE_LABELS.manual,
    meaning:
      'her contraception is one the product does not classify; you decide how her program adapts.',
  },
  {
    term: CYCLE_MODE_NOT_ANSWERED,
    meaning: 'the cycle form is empty.',
  },
];

export function noMeasurementsYetLine(gender: JourneyGender): string {
  const { subject } = clientPronouns(gender);

  return `${subject.capitalised} ${subject.hasVerb} not sent any measurements yet.`;
}

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
