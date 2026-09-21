import type { CoachingSubscription } from './coachingSubscription';

export type JourneyStage =
  | 'held'
  | 'payment-link-sent'
  | 'paid'
  | 'invited'
  | 'account-created'
  | 'onboarding'
  | 'submitted'
  | 'reviewing'
  | 'needs-details'
  | 'approved'
  | 'program-ready'
  | 'review-call-scheduled';

export const JOURNEY_STAGES: readonly JourneyStage[] = [
  'held',
  'payment-link-sent',
  'paid',
  'invited',
  'account-created',
  'onboarding',
  'submitted',
  'reviewing',
  'needs-details',
  'approved',
  'program-ready',
  'review-call-scheduled',
];

export type JourneyEvent =
  | 'send-payment-link'
  | 'record-payment'
  | 'send-invitation'
  | 'create-account'
  | 'start-onboarding'
  | 'submit-onboarding'
  | 'start-review'
  | 'request-details'
  | 'answer-request'
  | 'approve-answers'
  | 'mark-program-ready'
  | 'schedule-review-call';

export type JourneySex = 'female' | 'male';

export type JourneyPricing = 'regular' | 'reduced';

export type JourneyLinkState = 'valid' | 'expired' | 'used';

export type JourneyPhone = { diallingCode: string; number: string };

export type JourneyIdentity = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  email: string;
  phone?: JourneyPhone;
  sex: JourneySex;
  country: string;
};

export type JourneyPaymentLink = {
  token: string;
  sentAt: Date;
  state: JourneyLinkState;
};

export type JourneyInvitation = {
  token: string;
  sentAt: Date;
  expiresAt: Date;
  replaced: boolean;
  state: JourneyLinkState;
};

export type OnboardingFormId =
  | 'goal-availability'
  | 'safety-screening'
  | 'cycle-context'
  | 'nutrition-lifestyle'
  | 'measurements';

export const ONBOARDING_FORM_IDS: readonly OnboardingFormId[] = [
  'goal-availability',
  'safety-screening',
  'cycle-context',
  'nutrition-lifestyle',
  'measurements',
];

export type OnboardingAnswer = string | string[] | number | boolean | null;

export type OnboardingFormAnswers = Record<string, OnboardingAnswer>;

export type OnboardingConsents = {
  disclaimer: boolean;
  specialCategory: boolean;
  progressPhotos: boolean;
};

export type OnboardingDraft = {
  answers: Record<OnboardingFormId, OnboardingFormAnswers>;
  currentFormIndex: number;
  consents: OnboardingConsents;
};

export type JourneyOnboarding = OnboardingDraft & {
  submittedAt: Date | null;
};

export type ReviewStage = Extract<JourneyStage, 'reviewing' | 'approved'>;

export type DetailRequest = {
  questionIds: string[];
  message: string;
  createdAt: Date;
  raisedFrom: ReviewStage;
  answeredAt?: Date;
};

export type JourneyReview = {
  requests: DetailRequest[];
};

export type MeasurementEntry = {
  recordedAt: Date;
  weightKg: number;
  waistCm: number;
  hipsCm?: number;
  thighCm?: number;
  armCm?: number;
};

export type ReviewCall = {
  startsAt: Date;
  scheduledAt: Date;
};

export type ClientJourney = {
  callId: string;
  stage: JourneyStage;
  identity: JourneyIdentity;
  pricing: JourneyPricing;
  paymentLink: JourneyPaymentLink | null;
  paidAt: Date | null;
  invitation: JourneyInvitation | null;
  welcomeSeen: boolean;
  onboarding: JourneyOnboarding;
  review: JourneyReview;
  programReadyAt: Date | null;
  reviewCall?: ReviewCall;
  measurements: MeasurementEntry[];
  subscription?: CoachingSubscription;
};

export type JourneyTransition =
  | { status: 'advanced'; journey: ClientJourney }
  | { status: 'rejected'; stage: JourneyStage; event: JourneyEvent };

const TRANSITIONS: Record<
  JourneyStage,
  Partial<Record<JourneyEvent, JourneyStage>>
> = {
  held: { 'send-payment-link': 'payment-link-sent' },
  'payment-link-sent': {
    'send-payment-link': 'payment-link-sent',
    'record-payment': 'paid',
  },
  paid: { 'send-invitation': 'invited' },
  invited: {
    'send-invitation': 'invited',
    'create-account': 'account-created',
  },
  'account-created': { 'start-onboarding': 'onboarding' },
  onboarding: { 'submit-onboarding': 'submitted' },
  submitted: {
    'start-review': 'reviewing',
    'mark-program-ready': 'program-ready',
  },
  reviewing: {
    'request-details': 'needs-details',
    'approve-answers': 'approved',
    'mark-program-ready': 'program-ready',
  },
  'needs-details': { 'answer-request': 'reviewing' },
  approved: {
    'request-details': 'needs-details',
    'mark-program-ready': 'program-ready',
  },
  'program-ready': { 'schedule-review-call': 'review-call-scheduled' },
  'review-call-scheduled': {},
};

function reopenedStage(journey: ClientJourney): ReviewStage {
  return journey.review.requests.at(-1)?.raisedFrom ?? 'reviewing';
}

export function advance(
  journey: ClientJourney,
  event: JourneyEvent,
): JourneyTransition {
  const nextStage = TRANSITIONS[journey.stage][event];

  if (!nextStage) {
    return { status: 'rejected', stage: journey.stage, event };
  }

  const stage =
    event === 'answer-request' ? reopenedStage(journey) : nextStage;

  return { status: 'advanced', journey: { ...journey, stage } };
}

export const COACH_STAGE_LABELS: Record<JourneyStage, string> = {
  held: 'Call held',
  'payment-link-sent': 'Payment link sent',
  paid: 'Paid',
  invited: 'Invited',
  'account-created': 'Invitation accepted',
  onboarding: 'Onboarding',
  submitted: 'Sent to coach',
  reviewing: 'Reviewing',
  'needs-details': 'Needs more details',
  approved: 'Approved',
  'program-ready': 'Program ready',
  'review-call-scheduled': 'Review call booked',
};

const CLIENT_STATUS_LABELS: Partial<Record<JourneyStage, string>> = {
  submitted: 'Sent to your coach',
  reviewing: 'Your coach is reviewing your answers',
  'needs-details': 'Your coach needs a few more details',
  approved: 'Your answers are approved',
  'program-ready': 'Your program is ready',
  'review-call-scheduled': 'Your program is ready',
};

export function clientStatusLabel(stage: JourneyStage): string | null {
  return CLIENT_STATUS_LABELS[stage] ?? null;
}

const COACH_REVIEW_STAGES: readonly JourneyStage[] = [
  'submitted',
  'reviewing',
  'needs-details',
  'approved',
];

export function awaitsCoachReview(stage: JourneyStage): boolean {
  return COACH_REVIEW_STAGES.includes(stage);
}

export function isBeforeStage(
  stage: JourneyStage,
  boundary: JourneyStage,
): boolean {
  return JOURNEY_STAGES.indexOf(stage) < JOURNEY_STAGES.indexOf(boundary);
}

export function emptyOnboardingDraft(): OnboardingDraft {
  return {
    answers: {
      'goal-availability': {},
      'safety-screening': {},
      'cycle-context': {},
      'nutrition-lifestyle': {},
      measurements: {},
    },
    currentFormIndex: 0,
    consents: {
      disclaimer: false,
      specialCategory: false,
      progressPhotos: false,
    },
  };
}

export function emptyOnboarding(): JourneyOnboarding {
  return { ...emptyOnboardingDraft(), submittedAt: null };
}
