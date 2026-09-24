import { describe, expect, it } from 'vitest';
import { emptyOnboardingDraft, type JourneyIdentity } from './journey';
import {
  ageOn,
  needsManualScreening,
  PARQ_MAX_AGE,
  PARQ_MIN_AGE,
  PARQ_QUESTION_IDS,
  screeningOutcome,
  withholdsNutritionAdvice,
} from './safetyScreening';

const NOW = new Date('2026-09-23T00:00:00.000Z');

function identityBornOn(dateOfBirth: string): JourneyIdentity {
  return {
    firstName: 'Jane',
    lastName: 'Doe',
    dateOfBirth,
    email: 'jane@example.com',
    sex: 'female',
    country: 'Romania',
  };
}

function clearedSafetyAnswers(): Record<string, string> {
  return Object.fromEntries(PARQ_QUESTION_IDS.map((id) => [id, 'No']));
}

describe('ageOn', () => {
  it('counts a birthday already passed this year', () => {
    // arrange
    const dateOfBirth = '2000-01-01';

    // act
    const age = ageOn(dateOfBirth, NOW);

    // assert
    expect(age).toBe(26);
  });

  it('holds off a year until the birthday arrives', () => {
    // arrange
    const dateOfBirth = '2000-12-31';

    // act
    const age = ageOn(dateOfBirth, NOW);

    // assert
    expect(age).toBe(25);
  });
});

describe('needsManualScreening', () => {
  it('flags an age below the PAR-Q+ floor', () => {
    // arrange
    const dateOfBirth = `${NOW.getFullYear() - (PARQ_MIN_AGE - 1)}-01-01`;

    // assert
    expect(needsManualScreening(dateOfBirth, NOW)).toBe(true);
  });

  it('flags an age above the PAR-Q+ ceiling', () => {
    // arrange
    const dateOfBirth = `${NOW.getFullYear() - (PARQ_MAX_AGE + 1)}-01-01`;

    // assert
    expect(needsManualScreening(dateOfBirth, NOW)).toBe(true);
  });

  it('clears an age inside the PAR-Q+ range', () => {
    // arrange
    const dateOfBirth = `${NOW.getFullYear() - 30}-01-01`;

    // assert
    expect(needsManualScreening(dateOfBirth, NOW)).toBe(false);
  });
});

describe('screeningOutcome', () => {
  it('is manual when the age falls outside the PAR-Q+ range, regardless of answers', () => {
    // arrange
    const draft = emptyOnboardingDraft();
    draft.answers['safety-screening'] = clearedSafetyAnswers();
    const identity = identityBornOn(`${NOW.getFullYear() - 12}-01-01`);

    // act
    const outcome = screeningOutcome(draft, identity, NOW);

    // assert
    expect(outcome).toBe('manual');
  });

  it('is pending while any of the seven questions is unanswered', () => {
    // arrange
    const draft = emptyOnboardingDraft();
    const identity = identityBornOn(`${NOW.getFullYear() - 30}-01-01`);

    // act
    const outcome = screeningOutcome(draft, identity, NOW);

    // assert
    expect(outcome).toBe('pending');
  });

  it('is cleared when every question is answered No', () => {
    // arrange
    const draft = emptyOnboardingDraft();
    draft.answers['safety-screening'] = clearedSafetyAnswers();
    const identity = identityBornOn(`${NOW.getFullYear() - 30}-01-01`);

    // act
    const outcome = screeningOutcome(draft, identity, NOW);

    // assert
    expect(outcome).toBe('cleared');
  });

  it('needs review once any question is answered Yes', () => {
    // arrange
    const draft = emptyOnboardingDraft();
    draft.answers['safety-screening'] = {
      ...clearedSafetyAnswers(),
      heartCondition: 'Yes',
    };
    const identity = identityBornOn(`${NOW.getFullYear() - 30}-01-01`);

    // act
    const outcome = screeningOutcome(draft, identity, NOW);

    // assert
    expect(outcome).toBe('needs-review');
  });
});

describe('withholdsNutritionAdvice', () => {
  it('holds nutrition advice back when a chronic condition is diagnosed', () => {
    // arrange
    const draft = emptyOnboardingDraft();
    draft.answers['safety-screening'] = {
      ...clearedSafetyAnswers(),
      chronicConditionDiagnosed: 'Yes',
    };

    // assert
    expect(withholdsNutritionAdvice(draft)).toBe(true);
  });

  it('holds nutrition advice back when medication is taken for a chronic condition', () => {
    // arrange
    const draft = emptyOnboardingDraft();
    draft.answers['safety-screening'] = {
      ...clearedSafetyAnswers(),
      chronicConditionMedication: 'Yes',
    };

    // assert
    expect(withholdsNutritionAdvice(draft)).toBe(true);
  });

  it('does not hold nutrition advice back otherwise', () => {
    // arrange
    const draft = emptyOnboardingDraft();
    draft.answers['safety-screening'] = clearedSafetyAnswers();

    // assert
    expect(withholdsNutritionAdvice(draft)).toBe(false);
  });
});
