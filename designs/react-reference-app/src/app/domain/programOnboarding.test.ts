import { describe, expect, it } from 'vitest';
import { seedJourney } from '../services/clientJourneySamples';
import type { ClientJourney, OnboardingFormId } from './journey';
import {
  clientEquipment,
  equipmentChipsOf,
  equipmentForChips,
  estimatedCycleDay,
  levelHintOf,
  recurringSymptoms,
  sessionMinutesOf,
  setupFromJourney,
  trainingDaysOf,
} from './programOnboarding';
import { EQUIPMENT } from './exercises';

function demoJourney(cycleOverrides: Record<string, unknown> = {}): ClientJourney {
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
    stage: 'approved',
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

function withGoalAnswers(answers: Record<string, string | string[]>): ClientJourney {
  const journey = demoJourney();
  return {
    ...journey,
    onboarding: {
      ...journey.onboarding,
      answers: {
        ...journey.onboarding.answers,
        'goal-availability': { ...journey.onboarding.answers['goal-availability'], ...answers },
      },
    },
  };
}

function withEquipment(chips: string[]): ClientJourney {
  return withGoalAnswers({ availableEquipment: chips });
}

function withTrainingDays(days: string): ClientJourney {
  return withGoalAnswers({ trainingDaysPerWeek: days });
}

describe('answer mappers', () => {
  it('maps the experience level', () => {
    // act
    const levels = [
      levelHintOf('I train consistently and follow a structured program'),
      levelHintOf('I train regularly, but without a structured plan'),
      levelHintOf('I have trained before, but not recently'),
      levelHintOf(null),
    ];

    // assert
    expect(levels).toEqual(['intermediate', 'beginner', 'beginner', 'beginner']);
  });

  it('maps training days and session minutes with defaults', () => {
    // act
    const days = ['2 days', '3 days', '4 days', '5 or more days', null].map(trainingDaysOf);
    const minutes = ['Up to 30 minutes', '30–45 minutes', '45–60 minutes', null].map(sessionMinutesOf);

    // assert
    expect(days).toEqual([2, 3, 4, 5, 3]);
    expect(minutes).toEqual([30, 45, 60, 60]);
  });
});

describe('setupFromJourney', () => {
  it('reads the demo client onboarding', () => {
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

  it('suggests the upper and lower split for four training days', () => {
    // act
    const setup = setupFromJourney(withTrainingDays('4 days'));

    // assert
    expect(setup.splitShape).toBe('upper-lower');
  });

  it('starts the equipment from the onboarding chips', () => {
    // act
    const setup = setupFromJourney(withEquipment(['Dumbbells', 'Resistance bands']));

    // assert
    expect(setup.equipment).toEqual(['Dumbbells', 'Bench', 'Bands']);
  });
});

describe('clientEquipment', () => {
  it('lists every equipment value for a full gym', () => {
    // act
    const equipment = clientEquipment(withEquipment(['Full gym']));

    // assert
    expect(equipment).toEqual([...EQUIPMENT]);
  });

  it('maps chips, deduplicates and ignores unknown chips', () => {
    // act
    const equipment = clientEquipment(withEquipment(['Barbell', 'Dumbbells', 'Resistance bands', 'Unknown']));

    // assert
    expect(equipment).toEqual(['Barbell', 'Squat rack', 'Bench', 'EZ bar', 'Trap bar', 'Dumbbells', 'Bands']);
  });

  it('is empty for bodyweight only', () => {
    // act
    const equipment = clientEquipment(withEquipment(['Bodyweight only']));

    // assert
    expect(equipment).toEqual([]);
  });
});

describe('equipment chips', () => {
  it('reads the chips she picked in onboarding', () => {
    // act
    const chips = equipmentChipsOf(withEquipment(['Dumbbells', 'Resistance bands']));

    // assert
    expect(chips).toEqual(['Dumbbells', 'Resistance bands']);
  });

  it('maps chips to library equipment', () => {
    // act
    const equipment = equipmentForChips(['Kettlebells', 'Resistance bands']);

    // assert
    expect(equipment).toEqual(['Kettlebell', 'Bands']);
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
