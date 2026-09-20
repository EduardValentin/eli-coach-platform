import { addDays, subDays } from 'date-fns';
import {
  emptyOnboarding,
  isBeforeStage,
  ONBOARDING_FORM_IDS,
  type ClientJourney,
  type JourneyIdentity,
  type JourneyOnboarding,
  type JourneyPricing,
  type JourneyStage,
  type MeasurementEntry,
} from '../domain/journey';
import {
  periodEnd,
  resolveDay1,
  type CoachingSubscription,
  type SubscriptionStartPath,
  type SubscriptionStatus,
} from '../domain/coachingSubscription';
import { INVITATION_VALIDITY_DAYS } from './invitationService';
import type { PrototypeBooking } from './assessmentCallService';

export const SEEDED_BUNDLE = 3;

export type JourneySeed = {
  callId: string;
  identity: JourneyIdentity;
  stage: JourneyStage;
  startPath: SubscriptionStartPath;
  subscriptionStatus: SubscriptionStatus;
  pricing: JourneyPricing;
  now: Date;
};

type SubscriptionSeed = {
  purchasedAt: Date;
  programReadyAt: Date | null;
  startPath: SubscriptionStartPath;
  status: SubscriptionStatus;
  now: Date;
};

const SEEDED_GOAL_ANSWERS = {
  weight: 66.1,
  height: 165,
  goalWeight: 62,
  primaryGoal: 'Lose fat',
  experienceLevel: 'Some experience',
  trainingDaysPerWeek: 3,
  minutesPerSession: 60,
  realisticTimeframe: 24,
  lifestyleActivityLevel: 'Mostly sitting',
  availableEquipment: ['Full gym', 'Dumbbells'],
  trainingPlace: 'Gym',
};

const SEEDED_SAFETY_ANSWERS = {
  heartCondition: 'No',
  chestPainOnExertion: 'No',
  dizzinessOrFainting: 'No',
  boneOrJointProblem: 'Yes',
  chronicConditionMedication: 'No',
  currentInjury: 'Yes',
  currentInjuryDetail: 'Right shoulder aches on overhead pressing.',
  doctorProhibitedActivity: 'No',
  adviceToAvoidExertion: 'No',
};

const SEEDED_CYCLE_ANSWERS = {
  cycleRegularity: 'Regular',
  averageCycleLength: 29,
  lastPeriodStart: '2026-09-08',
  hormonalContraception: 'None',
  pregnancyStatus: 'None',
  perimenopauseOrMenopause: 'No',
  gynaecologicalCondition: 'No',
  recurringSymptoms: ['Fatigue', 'Appetite changes'],
};

const SEEDED_LIFESTYLE_ANSWERS = {
  eatingStyle: 'No particular style',
  foodPreferences: 'Chicken, rice, Greek yoghurt, anything with eggs.',
  allergiesOrIntolerances: 'Lactose, mild',
  foodsYouAvoid: 'Liver',
  mealsPerDay: 3,
  mealSchedule: 'Around 8, 14 and 20',
  jobType: 'Sedentary',
  sleepHours: 7,
  smoking: 'No',
  whoCooks: 'I cook, about 30 minutes on a weeknight',
  currentSupplements: 'Vitamin D',
  checkInDay: 'Monday',
  checkInChannel: 'In-app messages',
};

const SEEDED_MEASUREMENT_ANSWERS = {
  weight: 66.1,
  waist: 74,
  hips: 98,
};

const SEEDED_DETAIL_REQUEST = {
  questionIds: ['sleepHours', 'currentInjuryDetail'],
  message:
    'Two quick things before I build your plan — tell me a little more about your sleep and about that shoulder.',
};

export function identityFromBooking(booking: PrototypeBooking): JourneyIdentity {
  const [firstName, ...rest] = booking.visitorName.trim().split(/\s+/);

  return {
    firstName: firstName ?? booking.visitorName,
    lastName: rest.join(' '),
    dateOfBirth: '',
    email: booking.visitorEmail,
    sex: 'female',
    country: 'Romania',
  };
}

const MEASUREMENT_HISTORY: readonly Omit<MeasurementEntry, 'recordedAt'>[] = [
  { weightKg: 67.4, waistCm: 76.5, hipsCm: 99, thighCm: 58, armCm: 28 },
  { weightKg: 66.8, waistCm: 75.5, hipsCm: 98.5 },
  { weightKg: 66.1, waistCm: 74, hipsCm: 98, thighCm: 57, armCm: 28 },
];

function seedMeasurements(latestRecordedAt: Date): MeasurementEntry[] {
  return MEASUREMENT_HISTORY.map((readings, index) => ({
    ...readings,
    recordedAt: subDays(
      latestRecordedAt,
      (MEASUREMENT_HISTORY.length - 1 - index) * 7,
    ),
  }));
}

function seedOnboarding(
  stage: JourneyStage,
  identity: JourneyIdentity,
  submittedAt: Date,
): JourneyOnboarding {
  const empty = emptyOnboarding();

  if (isBeforeStage(stage, 'onboarding')) return empty;

  const consents = {
    disclaimer: true,
    specialCategory: true,
    progressPhotos: false,
  };

  if (isBeforeStage(stage, 'submitted')) {
    return {
      ...empty,
      consents,
      currentFormIndex: 2,
      answers: { ...empty.answers, 'goal-availability': SEEDED_GOAL_ANSWERS },
    };
  }

  return {
    ...empty,
    consents,
    currentFormIndex: ONBOARDING_FORM_IDS.length - 1,
    answers: {
      'goal-availability': SEEDED_GOAL_ANSWERS,
      'safety-screening': SEEDED_SAFETY_ANSWERS,
      'cycle-context': identity.sex === 'female' ? SEEDED_CYCLE_ANSWERS : {},
      'nutrition-lifestyle': SEEDED_LIFESTYLE_ANSWERS,
      measurements: SEEDED_MEASUREMENT_ANSWERS,
    },
    submittedAt,
  };
}

function seedSubscription(seed: SubscriptionSeed): CoachingSubscription {
  const base: CoachingSubscription = {
    bundle: SEEDED_BUNDLE,
    startPath: seed.startPath,
    purchasedAt: seed.purchasedAt,
    status: seed.status,
  };

  const day1 = resolveDay1(seed);
  if (day1 === null) return base;

  if (seed.status === 'ended') {
    return {
      ...base,
      day1,
      cancelledAt: subDays(seed.now, 2),
      periodEndsAt: subDays(seed.now, 1),
    };
  }

  const periodEndsAt = periodEnd(day1, base.bundle, 0);

  if (seed.status === 'cancelled') {
    return { ...base, day1, periodEndsAt, cancelledAt: subDays(seed.now, 1) };
  }

  return { ...base, day1, periodEndsAt };
}

export function seedJourney(seed: JourneySeed): ClientJourney {
  const { callId, identity, stage, startPath, subscriptionStatus, pricing, now } =
    seed;
  const reached = (target: JourneyStage) => !isBeforeStage(stage, target);

  const paymentLinkSentAt = subDays(now, 6);
  const paidAt = subDays(now, 5);
  const invitedAt = subDays(now, 5);
  const submittedAt = subDays(now, 3);
  const programReadyAt = subDays(now, 1);

  return {
    callId,
    stage,
    identity,
    pricing,
    paymentLink: reached('payment-link-sent')
      ? {
          token: `pl-seed-${callId}`,
          sentAt: paymentLinkSentAt,
          state: reached('paid') ? 'used' : 'valid',
        }
      : null,
    paidAt: reached('paid') ? paidAt : null,
    invitation: reached('invited')
      ? {
          token: `inv-seed-${callId}`,
          sentAt: invitedAt,
          expiresAt: addDays(invitedAt, INVITATION_VALIDITY_DAYS),
          replaced: false,
          state: reached('account-created') ? 'used' : 'valid',
        }
      : null,
    welcomeSeen: reached('onboarding'),
    onboarding: seedOnboarding(stage, identity, submittedAt),
    review:
      stage === 'needs-details'
        ? {
            requests: [{ ...SEEDED_DETAIL_REQUEST, createdAt: subDays(now, 2) }],
          }
        : { requests: [] },
    programReadyAt: reached('program-ready') ? programReadyAt : null,
    reviewCall: reached('review-call-scheduled')
      ? { startsAt: addDays(now, 1), scheduledAt: subDays(now, 1) }
      : undefined,
    measurements: reached('submitted') ? seedMeasurements(submittedAt) : [],
    subscription: reached('paid')
      ? seedSubscription({
          purchasedAt: paidAt,
          programReadyAt: reached('program-ready') ? programReadyAt : null,
          startPath,
          status: subscriptionStatus,
          now,
        })
      : undefined,
  };
}

export function heldJourney(
  booking: PrototypeBooking,
  pricing: JourneyPricing,
): ClientJourney {
  return {
    callId: booking.id,
    stage: 'held',
    identity: identityFromBooking(booking),
    pricing,
    paymentLink: null,
    paidAt: null,
    invitation: null,
    welcomeSeen: false,
    onboarding: emptyOnboarding(),
    review: { requests: [] },
    programReadyAt: null,
    measurements: [],
  };
}
