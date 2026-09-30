import { describe, expect, it } from 'vitest';
import type { PrototypeMode } from '../context/AppContext';
import {
  isBeforeStage,
  JOURNEY_STAGES,
  type JourneyStage,
} from '../domain/journey';
import { seedJourney } from './clientJourneySamples';

const NOW = new Date(2026, 8, 21, 12, 0, 0);

function submittedJourney(prototypeMode: PrototypeMode) {
  return journeyAt('submitted', prototypeMode);
}

function journeyAt(stage: JourneyStage, prototypeMode: PrototypeMode) {
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
