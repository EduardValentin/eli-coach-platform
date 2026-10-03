import { addDays, addMonths, set, subDays } from 'date-fns';
import {
  emptyOnboarding,
  isBeforeStage,
  ONBOARDING_FORM_IDS,
  type ClientJourney,
  type JourneyIdentity,
  type JourneyInvitation,
  type JourneyLinkState,
  type JourneyOnboarding,
  type JourneyPhone,
  type JourneyPricing,
  type JourneyGender,
  type JourneyStage,
  type MeasurementEntry,
  NO_PROGRESS_PHOTOS,
  type ProgressPhoto,
  type ProgressPhotoSet,
} from '../domain/journey';
import {
  MEASUREMENTS_CADENCE_DAYS,
  WEIGH_IN_CADENCE_DAYS,
} from '../domain/measurementSchedule';
import { profileFromOnboarding } from '../domain/clientProfile';
import {
  cancel,
  periodEnd,
  resolveDay1,
  settleRefund,
  WITHDRAWAL_WINDOW_DAYS,
  type CoachingSubscription,
  type SubscriptionStartPath,
  type SubscriptionStatus,
} from '../domain/coachingSubscription';
import { bundleForMonths, bundleTotal } from '../domain/bundles';
import {
  INVITATION_VALIDITY_DAYS,
  type PrototypeInvitationStanding,
} from './invitationService';
import { paymentLinkExpiresAt } from './paymentLinkService';
import { toCents } from '../utils/money';
import type { PrototypeBooking } from './assessmentCallService';
import { findCountry } from './countries';
import type { VisitorGender } from './visitorProfile';
import type { PrototypeMode } from '../context/AppContext';

export const SEEDED_BUNDLE = 3;

export type PrototypeMeasurementsDue = 'none' | 'weigh-in' | 'measurements';

export const PROTOTYPE_MEASUREMENTS_DUE: readonly PrototypeMeasurementsDue[] = [
  'none',
  'weigh-in',
  'measurements',
];

export type PrototypeSeededPhotos = 'none' | 'latest';

export const PROTOTYPE_SEEDED_PHOTOS: readonly PrototypeSeededPhotos[] = [
  'none',
  'latest',
];

const SEEDED_PROGRESS_PHOTO: ProgressPhoto = {
  url: `${import.meta.env.BASE_URL}media/progress-photo-placeholder.svg`,
};

const SEEDED_PROGRESS_PHOTOS: ProgressPhotoSet = {
  front: SEEDED_PROGRESS_PHOTO,
  side: SEEDED_PROGRESS_PHOTO,
  back: SEEDED_PROGRESS_PHOTO,
};

export type PrototypeRefund = 'none' | 'due' | 'part-refunded' | 'refunded';

export const PROTOTYPE_REFUNDS: readonly PrototypeRefund[] = [
  'none',
  'due',
  'part-refunded',
  'refunded',
];

export type PrototypeDaysSincePayment =
  | 'stage'
  | '1'
  | '5'
  | '13'
  | '14'
  | '30'
  | '100';

export const PROTOTYPE_DAYS_SINCE_PAYMENT: readonly PrototypeDaysSincePayment[] =
  ['stage', '1', '5', '13', '14', '30', '100'];

const PART_REFUND_SHARE = 1 / 3;

export type PrototypeLifeStage = 'none' | 'pregnant';

export const PROTOTYPE_LIFE_STAGES: readonly PrototypeLifeStage[] = [
  'none',
  'pregnant',
];

const LIFE_STAGE_ANSWERS: Record<PrototypeLifeStage, string[]> = {
  none: ['None of these'],
  pregnant: ['Pregnant'],
};

const SUBMITTED_DAYS_AGO = 3;

const LATEST_ENTRY_AGE_DAYS: Record<PrototypeMeasurementsDue, number> = {
  none: SUBMITTED_DAYS_AGO,
  'weigh-in': WEIGH_IN_CADENCE_DAYS + 1,
  measurements: MEASUREMENTS_CADENCE_DAYS + 1,
};

const SEEDED_CALL_HOUR = 15;

export type JourneySeed = {
  callId: string;
  identity: JourneyIdentity;
  stage: JourneyStage;
  startPath: SubscriptionStartPath;
  subscriptionStatus: SubscriptionStatus;
  pricing: JourneyPricing;
  bookingNotes: string | null;
  invitationStanding: PrototypeInvitationStanding;
  prototypeMode: PrototypeMode;
  measurementsDue: PrototypeMeasurementsDue;
  lifeStage: PrototypeLifeStage;
  seededPhotos: PrototypeSeededPhotos;
  refund: PrototypeRefund;
  paymentProblem: boolean;
  daysSincePayment: PrototypeDaysSincePayment;
  now: Date;
};

type SubscriptionSeed = {
  purchasedAt: Date;
  amountPaidCents: number;
  programReadyAt: Date | null;
  startPath: SubscriptionStartPath;
  status: SubscriptionStatus;
  refund: PrototypeRefund;
  paymentProblem: boolean;
  now: Date;
};

const SEEDED_GOAL_ANSWERS = {
  weight: 66.1,
  height: 165,
  goalWeight: 62,
  primaryGoal: 'Lose fat',
  blockers: ['Busy schedule'],
  experienceLevel: 'I train regularly, but without a structured plan',
  trainingDaysPerWeek: '3 days',
  minutesPerSession: '45–60 minutes',
  previousPt: 'No',
  coachExpectations: 'Someone to keep me consistent and honest.',
  additionalInfo: 'Night shifts twice a week, so those days start late.',
  lifestyleActivityLevel: 'Mostly sitting',
  availableEquipment: ['Full gym', 'Dumbbells'],
  trainingPlace: 'Gym',
};

const SEEDED_SAFETY_ANSWERS = {
  heartCondition: 'No',
  chestPainOnExertion: 'No',
  dizzinessOrFainting: 'No',
  chronicConditionDiagnosed: 'No',
  chronicConditionMedication: 'No',
  boneOrJointProblem: 'Yes',
  boneOrJointProblemList: 'Right shoulder aches on overhead pressing.',
  doctorProhibitedActivity: 'No',
  parqDeclaration: true,
};

const SEEDED_CYCLE_ANSWERS = {
  cycleRegularity: "Yes, and it's regular",
  cycleLength: 29,
  lastPeriodStart: '2026-09-08',
  hormonalContraception: 'None',
  perimenopauseOrMenopause: 'No',
  gynaecologicalCondition: 'No',
  recurringSymptoms: ['Fatigue', 'Appetite changes'],
};

const SEEDED_LIFESTYLE_ANSWERS = {
  eatingStyle: 'No restrictions',
  allergiesOrIntolerances: 'Yes',
  allergiesOrIntolerancesList: 'Lactose, mild',
  foodPreferences: 'Chicken, rice, Greek yoghurt, anything with eggs.',
  foodsYouAvoid: 'Liver',
  mealsPerDay: 'Three',
  snacksPerDay: 'One',
  firstMeal: '7–9am',
  lastMeal: '6–8pm',
  energyDips: 'Sometimes',
  energyDipsWhen: ['Afternoon'],
  jobType: 'Mostly sitting',
  sleepHours: '6–7 hours',
  eatingOutFrequency: 'Bring food from home',
  cookingSetup: 'I do',
  cookingTime: '15–30 minutes',
  waterPerDay: '2–5 glasses',
  nutritionGoal: 'Stop skipping meals when work gets busy.',
  checkInDay: 'Monday',
  checkInChannel: 'Email',
};

const SEEDED_MEASUREMENT_ANSWERS = {
  waist: 74,
  hips: 98,
};

const SEEDED_DETAIL_REQUEST = {
  questionIds: ['sleepHours', 'boneOrJointProblemList'],
  raisedFrom: 'reviewing' as const,
  message:
    'Two quick things before I build your plan — tell me a little more about your sleep and about that shoulder.',
};

function journeyPhone(
  phone: string | null,
  diallingCode: string,
): JourneyPhone | undefined {
  if (!phone) return undefined;
  const number =
    diallingCode && phone.startsWith(diallingCode)
      ? phone.slice(diallingCode.length)
      : phone;
  return { diallingCode, number };
}

function journeyGenderOf(gender: VisitorGender): JourneyGender {
  return gender === 'prefer_not_to_say' ? 'prefer-not-to-say' : gender;
}

export function identityFromBooking(
  booking: PrototypeBooking,
): JourneyIdentity {
  const country = findCountry(booking.country);

  return {
    firstName: booking.firstName,
    lastName: booking.lastName,
    dateOfBirth: booking.dateOfBirth,
    email: booking.visitorEmail,
    phone: journeyPhone(booking.phone, country?.callingCode ?? ''),
    gender: journeyGenderOf(booking.gender),
    country: country?.name ?? booking.country,
    primaryGoal: booking.primaryGoal,
  };
}

type MeasurementReadings = Omit<MeasurementEntry, 'id' | 'recordedAt' | 'photos'>;

const MEASUREMENT_HISTORY: readonly MeasurementReadings[] = [
  { weightKg: 67.4, waistCm: 76.5, hipsCm: 99, thighCm: 58, armCm: 28 },
  { weightKg: 66.8, waistCm: 75.5, hipsCm: 98.5 },
  { weightKg: 66.1, waistCm: 74, hipsCm: 98, thighCm: 57, armCm: 28 },
];

function seedMeasurements(
  latestRecordedAt: Date,
  prototypeMode: PrototypeMode,
  seededPhotos: PrototypeSeededPhotos,
): MeasurementEntry[] {
  const history =
    prototypeMode === 'post-mvp'
      ? MEASUREMENT_HISTORY
      : MEASUREMENT_HISTORY.slice(-1);

  return history.map((readings, index) => ({
    ...readings,
    id: `seed-entry-${index}`,
    recordedAt: subDays(
      latestRecordedAt,
      (history.length - 1 - index) * WEIGH_IN_CADENCE_DAYS,
    ),
    photos:
      seededPhotos === 'latest' && index === history.length - 1
        ? SEEDED_PROGRESS_PHOTOS
        : NO_PROGRESS_PHOTOS,
  }));
}

function seedOnboarding(
  seed: JourneySeed,
  submittedAt: Date,
): JourneyOnboarding {
  const { stage, identity, lifeStage } = seed;
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
      'cycle-context':
        identity.gender === 'female'
          ? { ...SEEDED_CYCLE_ANSWERS, lifeStage: LIFE_STAGE_ANSWERS[lifeStage] }
          : {},
      'nutrition-lifestyle': SEEDED_LIFESTYLE_ANSWERS,
      measurements: SEEDED_MEASUREMENT_ANSWERS,
    },
    submittedAt,
  };
}

function seedInvitation(
  seed: JourneySeed,
  invitedAt: Date,
): JourneyInvitation {
  const expiresAt = addDays(invitedAt, INVITATION_VALIDITY_DAYS);

  return {
    token: `inv-seed-${seed.callId}`,
    sentAt: invitedAt,
    expiresAt,
    state: seededInvitationState(seed.stage, expiresAt, seed.now),
    emailDelivery: seed.invitationStanding === 'email-failed' ? 'failed' : 'sent',
  };
}

function seededInvitationState(
  stage: JourneyStage,
  expiresAt: Date,
  now: Date,
): JourneyLinkState {
  if (!isBeforeStage(stage, 'account-created')) return 'used';

  return expiresAt <= now ? 'expired' : 'valid';
}

function runningSubscription(seed: SubscriptionSeed): CoachingSubscription {
  const base: CoachingSubscription = {
    bundle: SEEDED_BUNDLE,
    startPath: seed.startPath,
    purchasedAt: seed.purchasedAt,
    amountPaidCents: seed.amountPaidCents,
    status: seed.status,
    paymentProblem: seed.paymentProblem,
  };

  const day1 = resolveDay1(seed);
  if (day1 === null) return base;

  return { ...base, day1, periodEndsAt: periodEnd(day1, base.bundle, 0) };
}

function refundableCancellationAt(purchasedAt: Date, now: Date): Date {
  const lastRefundableDay = addDays(purchasedAt, WITHDRAWAL_WINDOW_DAYS - 1);
  const dayBefore = subDays(now, 1);
  const cancelledAt = dayBefore < lastRefundableDay ? dayBefore : lastRefundableDay;

  return cancelledAt < purchasedAt ? purchasedAt : cancelledAt;
}

function refundedSubscription(
  running: CoachingSubscription,
  refund: Exclude<PrototypeRefund, 'none'>,
  now: Date,
): CoachingSubscription {
  const cancelled = cancel(
    { ...running, startPath: 'waiting', status: 'not-started' },
    refundableCancellationAt(running.purchasedAt, now),
  );
  const amountCents = cancelled.refund?.amountCents ?? 0;

  if (refund === 'part-refunded') {
    return settleRefund(cancelled, {
      refundedCents: Math.round(amountCents * PART_REFUND_SHARE),
      at: now,
    });
  }
  if (refund === 'refunded') {
    return settleRefund(cancelled, { refundedCents: amountCents, at: now });
  }

  return cancelled;
}

function seedSubscription(seed: SubscriptionSeed): CoachingSubscription {
  const running = runningSubscription(seed);

  if (seed.refund !== 'none') {
    return refundedSubscription(running, seed.refund, seed.now);
  }

  if (seed.status === 'ended') {
    return {
      ...running,
      cancelledAt: subDays(seed.now, 2),
      periodEndsAt: subDays(seed.now, 1),
    };
  }

  if (seed.status === 'cancelled') {
    return {
      ...running,
      cancelledAt: subDays(seed.now, 1),
      periodEndsAt:
        running.periodEndsAt ?? addMonths(seed.purchasedAt, running.bundle),
    };
  }

  return running;
}

const EXPIRED_INVITATION_AGE_DAYS = INVITATION_VALIDITY_DAYS + 5;

function seededPaidAt(seed: JourneySeed): Date {
  const { startPath, stage, invitationStanding, daysSincePayment, now } = seed;

  if (daysSincePayment !== 'stage') {
    return subDays(now, Number(daysSincePayment));
  }

  const invitationPending = isBeforeStage(stage, 'account-created');
  if (invitationStanding === 'expired' && invitationPending) {
    return subDays(now, EXPIRED_INVITATION_AGE_DAYS);
  }
  if (startPath === 'waiting' && !isBeforeStage(stage, 'program-ready')) {
    return subDays(now, WITHDRAWAL_WINDOW_DAYS + 2);
  }

  return subDays(now, 5);
}

function seededCallStart(paymentLinkSentAt: Date): Date {
  return set(subDays(paymentLinkSentAt, 1), {
    hours: SEEDED_CALL_HOUR,
    minutes: 0,
    seconds: 0,
    milliseconds: 0,
  });
}

export function seedJourney(seed: JourneySeed): ClientJourney {
  const {
    callId,
    identity,
    stage,
    startPath,
    subscriptionStatus,
    pricing,
    bookingNotes,
    prototypeMode,
    measurementsDue,
    seededPhotos,
    now,
  } = seed;
  const reached = (target: JourneyStage) => !isBeforeStage(stage, target);

  const paidAt = seededPaidAt(seed);
  const paymentLinkSentAt = subDays(paidAt, 1);
  const invitedAt = paidAt;
  const submittedAt = subDays(now, SUBMITTED_DAYS_AGO);
  const programReadyAt = subDays(now, 1);
  const onboarding = seedOnboarding(seed, submittedAt);
  const measurements = reached('submitted')
    ? seedMeasurements(
        subDays(now, LATEST_ENTRY_AGE_DAYS[measurementsDue]),
        prototypeMode,
        seededPhotos,
      )
    : [];

  return {
    callId,
    callStartsAt: seededCallStart(paymentLinkSentAt),
    stage,
    identity,
    profile: reached('submitted')
      ? profileFromOnboarding(onboarding.answers)
      : null,
    pricing,
    bookingNotes,
    paymentLink: reached('payment-link-sent')
      ? {
          token: `pl-seed-${callId}`,
          sentAt: paymentLinkSentAt,
          expiresAt: paymentLinkExpiresAt(paymentLinkSentAt),
          state: reached('invited') ? 'used' : 'valid',
        }
      : null,
    paidAt: reached('invited') ? paidAt : null,
    invitation: reached('invited') ? seedInvitation(seed, invitedAt) : null,
    welcomeSeen: reached('onboarding'),
    onboarding,
    review:
      stage === 'needs-details'
        ? {
            requests: [
              { ...SEEDED_DETAIL_REQUEST, createdAt: subDays(now, 2) },
            ],
          }
        : { requests: [] },
    programReadyAt: reached('program-ready') ? programReadyAt : null,
    reviewCall: reached('review-call-scheduled')
      ? { startsAt: addDays(now, 1), scheduledAt: subDays(now, 1) }
      : undefined,
    measurements,
    progressPhotosConsentedAt: null,
    subscription: reached('invited')
      ? seedSubscription({
          purchasedAt: paidAt,
          amountPaidCents: toCents(
            bundleTotal(bundleForMonths(SEEDED_BUNDLE), pricing),
          ),
          programReadyAt: reached('program-ready') ? programReadyAt : null,
          startPath,
          status: subscriptionStatus,
          refund: seed.refund,
          paymentProblem: seed.paymentProblem,
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
    callStartsAt: booking.startsAt,
    stage: 'held',
    identity: identityFromBooking(booking),
    profile: null,
    pricing,
    bookingNotes: booking.notes.trim() || null,
    paymentLink: null,
    paidAt: null,
    invitation: null,
    welcomeSeen: false,
    onboarding: emptyOnboarding(),
    review: { requests: [] },
    programReadyAt: null,
    measurements: [],
    progressPhotosConsentedAt: null,
  };
}
