import { describe, expect, it } from 'vitest';
import { seedJourney } from '../services/clientJourneySamples';
import type { ClientJourney } from './journey';
import type { CoachingFacts } from './clientProfile';
import { EQUIPMENT } from './exercises';
import { libraryEquipmentFor, setupFromJourney } from './programOnboarding';

function demoJourney(stage: ClientJourney['stage'] = 'approved'): ClientJourney {
  return seedJourney({
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
      language: 'en',
      dailySteps: 6000,
      splitShape: 'full-body',
    });
  });

  it('follows the coach edits to her coaching facts', () => {
    // act
    const setup = setupFromJourney(
      withCoaching({ trainingDays: 4, level: 'advanced' }),
    );

    // assert
    expect(setup).toMatchObject({
      trainingDays: 4,
      splitShape: 'upper-lower',
      level: 'advanced',
    });
  });

  it('starts from neutral defaults before her answers are approved', () => {
    // act
    const setup = setupFromJourney(demoJourney('submitted'));

    // assert
    expect(setup).toMatchObject({
      goal: '',
      level: 'beginner',
      trainingDays: 3,
      sessionMinutes: 60,
    });
  });
});

describe('libraryEquipmentFor', () => {
  it('lists every library item for a full gym', () => {
    // act
    const equipment = libraryEquipmentFor(['Full gym']);

    // assert
    expect(equipment).toEqual([...EQUIPMENT]);
  });

  it('maps her equipment to library items without repeats', () => {
    // act
    const equipment = libraryEquipmentFor(['Barbell', 'Dumbbells', 'Resistance bands']);

    // assert
    expect(equipment).toEqual(['Barbell', 'Squat rack', 'Bench', 'EZ bar', 'Trap bar', 'Dumbbells', 'Bands']);
  });

  it('has no library items for bodyweight only', () => {
    // act
    const equipment = libraryEquipmentFor(['Bodyweight only']);

    // assert
    expect(equipment).toEqual([]);
  });
});
