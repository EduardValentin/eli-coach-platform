import { describe, expect, it } from 'vitest';
import type { PrototypeMode } from '../context/AppContext';
import {
  isBeforeStage,
  JOURNEY_STAGES,
  type JourneyStage,
} from '../domain/journey';
import { measurementDueLine } from '../domain/measurementSchedule';
import { subDays } from 'date-fns';
import {
  cancellationRule,
  deriveStatus,
  needsRefund,
  outstandingRefundCents,
} from '../domain/coachingSubscription';
import {
  seedJourney,
  type JourneySeed,
  type PrototypeMeasurementsDue,
  type PrototypeSeededPhotos,
} from './clientJourneySamples';

const NOW = new Date(2026, 8, 21, 12, 0, 0);

function submittedJourney(prototypeMode: PrototypeMode) {
  return journeyAt('submitted', prototypeMode);
}

function journeyAt(
  stage: JourneyStage,
  prototypeMode: PrototypeMode,
  measurementsDue: PrototypeMeasurementsDue = 'none',
  seededPhotos: PrototypeSeededPhotos = 'none',
) {
  return seedJourney({
    callId: 'ac-seed-measurements',
    identity: {
      firstName: 'Ana',
      lastName: 'Popescu',
      dateOfBirth: '1994-03-14',
      email: 'ana@example.com',
      gender: 'female',
      country: 'RO',
    },
    stage,
    startPath: 'immediate',
    subscriptionStatus: 'active',
    pricing: 'regular',
    bookingNotes: null,
    invitationStanding: 'sent',
    prototypeMode,
    measurementsDue,
    lifeStage: 'none',
    seededPhotos,
    refund: 'none',
    paymentProblem: false,
    daysSincePayment: 'stage',
    now: NOW,
  });
}

describe('seeding a submitted client measurements', () => {
  it('seeds only the entry written at submission in MVP mode', () => {
    // act
    const journey = submittedJourney('mvp');

    // assert
    expect(journey.measurements).toHaveLength(1);
    expect(journey.measurements[0]).toMatchObject({
      weightKg: 66.1,
      waistCm: 74,
      hipsCm: 98,
    });
    expect(journey.measurements[0].recordedAt).toEqual(
      journey.onboarding.submittedAt,
    );
  });

  it('seeds the weekly history in post-MVP mode, the submission entry last', () => {
    // act
    const journey = submittedJourney('post-mvp');

    // assert
    expect(journey.measurements.map((entry) => entry.waistCm)).toEqual([
      76.5, 75.5, 74,
    ]);
    expect(journey.measurements.at(-1)?.recordedAt).toEqual(
      journey.onboarding.submittedAt,
    );
  });
});

describe('seeding when her measurements are due', () => {
  it('seeds entries without photos and no photo consent', () => {
    // act
    const journey = submittedJourney('post-mvp');

    // assert
    expect(journey.measurements.map((entry) => entry.photos)).toEqual([
      {},
      {},
      {},
    ]);
    expect(journey.progressPhotosConsentedAt).toBeNull();
  });

  it('keeps her dashboard quiet by default', () => {
    // act
    const journey = journeyAt('program-ready', 'mvp', 'none');

    // assert
    expect(measurementDueLine(journey.measurements, NOW)).toBeNull();
  });

  it('ages her history so the weekly weigh-in is due', () => {
    // act
    const journey = journeyAt('program-ready', 'post-mvp', 'weigh-in');

    // assert
    expect(measurementDueLine(journey.measurements, NOW)).toBe('weigh-in');
  });

  it('ages her history so measurements and photos are due', () => {
    // act
    const journey = journeyAt('program-ready', 'mvp', 'measurements');

    // assert
    expect(measurementDueLine(journey.measurements, NOW)).toBe('measurements');
  });
});

describe('seeding progress photos', () => {
  it('gives the latest entry all three views and leaves the earlier ones bare', () => {
    // act
    const journey = journeyAt('submitted', 'post-mvp', 'none', 'latest');

    // assert
    const [first, second, latest] = journey.measurements;
    expect(first.photos).toEqual({});
    expect(second.photos).toEqual({});
    expect(Object.keys(latest.photos)).toEqual(['front', 'side', 'back']);
    expect(latest.photos.front?.url).toMatch(/^\/media\/.+\.svg$/);
  });

  it('seeds no photos unless asked', () => {
    // act
    const journey = journeyAt('submitted', 'mvp', 'none', 'none');

    // assert
    expect(journey.measurements.map((entry) => entry.photos)).toEqual([{}]);
  });
});

describe('seeding a client profile', () => {
  it('leaves her profile empty at every stage before she sends her onboarding', () => {
    // arrange
    const stagesBefore = JOURNEY_STAGES.filter((stage) =>
      isBeforeStage(stage, 'submitted'),
    );

    // act
    const profiles = stagesBefore.map(
      (stage) => journeyAt(stage, 'mvp').profile,
    );

    // assert
    expect(profiles).toEqual(stagesBefore.map(() => null));
  });

  it('builds her profile from the facts she stated once she sends her onboarding', () => {
    // arrange
    const stagesFrom = JOURNEY_STAGES.filter(
      (stage) => !isBeforeStage(stage, 'submitted'),
    );

    // act
    const profiles = stagesFrom.map(
      (stage) => journeyAt(stage, 'post-mvp').profile,
    );

    // assert
    for (const profile of profiles) {
      expect(profile).toEqual({
        heightCm: 165,
        activityLevel: 'Mostly sitting',
        primaryGoal: 'Lose fat',
        dietaryRestrictions: 'Lactose, mild',
        clientNotes: 'Night shifts twice a week, so those days start late.',
      });
    }
  });
});

function subscriptionSeededWith(overrides: Partial<JourneySeed>) {
  const journey = seedJourney({
    callId: 'ac-seed-subscription',
    identity: {
      firstName: 'Ana',
      lastName: 'Popescu',
      dateOfBirth: '1994-03-14',
      email: 'ana@example.com',
      gender: 'female',
      country: 'RO',
    },
    stage: 'submitted',
    startPath: 'immediate',
    subscriptionStatus: 'active',
    pricing: 'regular',
    bookingNotes: null,
    invitationStanding: 'sent',
    prototypeMode: 'mvp',
    measurementsDue: 'none',
    lifeStage: 'none',
    seededPhotos: 'none',
    refund: 'none',
    paymentProblem: false,
    daysSincePayment: 'stage',
    now: NOW,
    ...overrides,
  });

  if (!journey.subscription) throw new Error('expected a subscription');

  return journey.subscription;
}

describe('seeding the subscription', () => {
  it('records the bundle price she paid', () => {
    // act
    const subscription = subscriptionSeededWith({});

    // assert
    expect(subscription.amountPaidCents).toBe(44700);
  });

  it('dates the payment from the days since payment', () => {
    // act
    const subscription = subscriptionSeededWith({ daysSincePayment: '14' });

    // assert
    expect(subscription.purchasedAt).toEqual(subDays(NOW, 14));
    expect(cancellationRule(subscription, NOW)).toBe('no-refund');
  });

  it('reaches the full refund on the waiting path within 14 days', () => {
    // act
    const subscription = subscriptionSeededWith({
      startPath: 'waiting',
      daysSincePayment: '13',
    });

    // assert
    expect(cancellationRule(subscription, NOW)).toBe('full-refund');
  });

  it('seeds a cancellation without a refund with access until the bundle runs out', () => {
    // act
    const subscription = subscriptionSeededWith({
      subscriptionStatus: 'cancelled',
      daysSincePayment: '30',
    });

    // assert
    expect(deriveStatus(subscription, NOW)).toBe('cancelled');
    expect(subscription.periodEndsAt).toEqual(
      new Date(2026, 10, 22, 12, 0, 0),
    );
  });

  it('seeds an ended subscription with the refund still due', () => {
    // act
    const subscription = subscriptionSeededWith({
      startPath: 'waiting',
      refund: 'due',
    });

    // assert
    expect(deriveStatus(subscription, NOW)).toBe('ended');
    expect(subscription.refund).toMatchObject({
      amountCents: 44700,
      reason: 'full-refund',
      refundedCents: 0,
    });
    expect(needsRefund(subscription)).toBe(true);
  });

  it('seeds a refund on the waiting path, the only one that refunds', () => {
    // act
    const subscription = subscriptionSeededWith({
      startPath: 'immediate',
      refund: 'due',
    });

    // assert
    expect(subscription.startPath).toBe('waiting');
    expect(subscription.refund?.reason).toBe('full-refund');
  });

  it('seeds a partly refunded subscription with the rest still due', () => {
    // act
    const subscription = subscriptionSeededWith({ refund: 'part-refunded' });

    // assert
    expect(subscription.refund?.reason).toBe('full-refund');
    expect(outstandingRefundCents(subscription)).toBe(29800);
  });

  it('seeds a settled refund with its date', () => {
    // act
    const subscription = subscriptionSeededWith({ refund: 'refunded' });

    // assert
    expect(needsRefund(subscription)).toBe(false);
    expect(subscription.refund?.refundedAt).toEqual(NOW);
  });

  it('flags the payment problem', () => {
    // act
    const subscription = subscriptionSeededWith({ paymentProblem: true });

    // assert
    expect(subscription.paymentProblem).toBe(true);
  });
});
