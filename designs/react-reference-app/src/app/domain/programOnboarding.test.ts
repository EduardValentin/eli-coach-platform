import { describe, expect, it } from 'vitest';
import { seedJourney } from '../services/clientJourneySamples';
import type { ClientJourney, OnboardingFormId } from './journey';
import type { CoachingFacts } from './clientProfile';
import {
  estimatedCycleDay,
  recurringSymptoms,
  setupFromJourney,
} from './programOnboarding';

function demoJourney(cycleOverrides: Record<string, unknown> = {}, stage: ClientJourney['stage'] = 'approved'): ClientJourney {
  const journey = seedJourney({
    callId: 'program-onboarding',
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
    prototypeMode: 'mvp',
    measurementsDue: 'none',
    lifeStage: 'none',
    seededPhotos: 'none',
    seededAvatar: 'none',
    refund: 'none',
    paymentProblem: false,
    cardOnFile: 'visa',
    daysSincePayment: 'stage',
    now: new Date(2026, 8, 21, 12, 0, 0),
  });
  const cycle: OnboardingFormId = 'cycle-context';
  return {
    ...journey,
    onboarding: {
      ...journey.onboarding,
      answers: {
        ...journey.onboarding.answers,
        [cycle]: { ...journey.onboarding.answers[cycle], ...cycleOverrides },
      },
    },
  } as ClientJourney;
}

function withCoaching(edit: Partial<CoachingFacts>): ClientJourney {
  const journey = demoJourney();
  const { profile } = journey;
  return { ...journey, profile: { ...profile, coaching: profile.coaching && { ...profile.coaching, ...edit } } };
}

describe('setupFromJourney', () => {
  it('reads the demo client profile once her answers are approved', () => {
    // act
    const setup = setupFromJourney(demoJourney());

    // assert
    expect(setup).toMatchObject({
      level: 'beginner',
      trainingDays: 3,
      sessionMinutes: 60,
      goal: 'Lose fat',
      cycleMode: 'adapted',
      language: 'en',
      dailySteps: 6000,
      splitShape: 'full-body',
    });
  });

  it('follows the coach edits to her coaching facts', () => {
    // act
    const setup = setupFromJourney(
      withCoaching({ trainingDays: 4, level: 'advanced', cycleMode: 'general', equipment: ['Dumbbells', 'Bands'] }),
    );

    // assert
    expect(setup).toMatchObject({
      trainingDays: 4,
      splitShape: 'upper-lower',
      level: 'advanced',
      cycleMode: 'general',
      equipment: ['Dumbbells', 'Bands'],
    });
  });

  it('starts from neutral defaults before her answers are approved', () => {
    // act
    const setup = setupFromJourney(demoJourney({}, 'submitted'));

    // assert
    expect(setup).toMatchObject({
      goal: '',
      level: 'beginner',
      trainingDays: 3,
      sessionMinutes: 60,
      cycleMode: 'general',
      equipment: [],
    });
  });
});

describe('estimatedCycleDay', () => {
  const today = new Date(2026, 8, 25);

  it('counts days since the last period inside the cycle length', () => {
    // act
    const day = estimatedCycleDay(demoJourney(), today);

    // assert
    expect(day).toBe(18);
  });

  it('wraps around the cycle length', () => {
    // act
    const day = estimatedCycleDay(demoJourney(), new Date(2026, 9, 10));

    // assert
    expect(day).toBe(4);
  });

  it('uses the middle of an irregular range', () => {
    // arrange
    const journey = demoJourney({ cycleLength: null, cycleLengthMin: 26, cycleLengthMax: 32 });

    // act
    const day = estimatedCycleDay(journey, today);

    // assert
    expect(day).toBe(18);
  });

  it('is unknown when the last period is unknown', () => {
    // act
    const day = estimatedCycleDay(demoJourney({ lastPeriodUnknown: 'true' }), today);

    // assert
    expect(day).toBeNull();
  });

  it('is unknown when no length is given', () => {
    // act
    const day = estimatedCycleDay(demoJourney({ cycleLength: null }), today);

    // assert
    expect(day).toBeNull();
  });

  it('is unknown outside the adapted mode', () => {
    // act
    const day = estimatedCycleDay(demoJourney({ hormonalContraception: 'Combined pill' }), today);

    // assert
    expect(day).toBeNull();
  });
});

describe('recurringSymptoms', () => {
  it('drops None', () => {
    // act
    const symptoms = recurringSymptoms(demoJourney({ recurringSymptoms: ['None', 'Cramps'] }));

    // assert
    expect(symptoms).toEqual(['Cramps']);
  });
});
