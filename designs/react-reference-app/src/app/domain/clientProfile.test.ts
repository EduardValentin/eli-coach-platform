import { describe, expect, it } from 'vitest';
import { measuredWeights, profileFromOnboarding } from './clientProfile';
import {
  emptyOnboardingDraft,
  type MeasurementEntry,
  type OnboardingFormAnswers,
} from './journey';

function measurement(weightKg: number, day: number): MeasurementEntry {
  return { recordedAt: new Date(2026, 8, day), weightKg, waistCm: 74 };
}

function answersWith(forms: {
  goal?: OnboardingFormAnswers;
  food?: OnboardingFormAnswers;
}) {
  const empty = emptyOnboardingDraft().answers;

  return {
    ...empty,
    'goal-availability': forms.goal ?? {},
    'nutrition-lifestyle': forms.food ?? {},
  };
}

function restrictionsFor(food: OnboardingFormAnswers) {
  return profileFromOnboarding(answersWith({ food })).dietaryRestrictions;
}

describe('building her profile from the onboarding she sent', () => {
  it('holds only the facts she stated in her first form', () => {
    // arrange
    const answers = answersWith({
      goal: {
        height: 165,
        weight: 66.1,
        lifestyleActivityLevel: 'Mostly sitting',
        primaryGoal: 'Build muscle',
        additionalInfo: '  Night shifts twice a week.  ',
      },
    });

    // act
    const profile = profileFromOnboarding(answers);

    // assert
    expect(profile).toEqual({
      heightCm: 165,
      activityLevel: 'Mostly sitting',
      primaryGoal: 'Build muscle',
      dietaryRestrictions: 'None',
      clientNotes: 'Night shifts twice a week.',
    });
  });

  it('leaves what she did not answer empty', () => {
    // arrange
    const answers = answersWith({
      goal: { height: '165', additionalInfo: '   ' },
    });

    // act
    const profile = profileFromOnboarding(answers);

    // assert
    expect(profile).toEqual({
      heightCm: null,
      activityLevel: null,
      primaryGoal: null,
      dietaryRestrictions: 'None',
      clientNotes: null,
    });
  });
});

describe('reading her weights from her measurements', () => {
  it('starts from her earliest measurement and is currently at her latest', () => {
    // arrange
    const measurements = [
      measurement(67.4, 13),
      measurement(66.8, 20),
      measurement(66.1, 27),
    ];

    // act
    const weights = measuredWeights(measurements);

    // assert
    expect(weights).toEqual({ startingWeightKg: 67.4, currentWeightKg: 66.1 });
  });

  it('has no weights before her first measurement', () => {
    // act
    const weights = measuredWeights([]);

    // assert
    expect(weights).toEqual({ startingWeightKg: null, currentWeightKg: null });
  });
});

describe('summing up her dietary restrictions', () => {
  it('says none when she eats everything and has no allergies', () => {
    // act
    const restrictions = restrictionsFor({
      eatingStyle: 'No restrictions',
      allergiesOrIntolerances: 'No',
    });

    // assert
    expect(restrictions).toBe('None');
  });

  it('names the diet she follows', () => {
    // act
    const restrictions = restrictionsFor({
      eatingStyle: 'Vegetarian',
      allergiesOrIntolerances: 'No',
    });

    // assert
    expect(restrictions).toBe('Vegetarian');
  });

  it('uses her own words for a diet the list does not name', () => {
    // act
    const restrictions = restrictionsFor({
      eatingStyle: 'Something else',
      eatingStyleOther: '  Low FODMAP ',
    });

    // assert
    expect(restrictions).toBe('Low FODMAP');
  });

  it('falls back to something else when she did not describe her diet', () => {
    // act
    const restrictions = restrictionsFor({
      eatingStyle: 'Something else',
      eatingStyleOther: '  ',
    });

    // assert
    expect(restrictions).toBe('Something else');
  });

  it('adds the allergies she listed after her diet', () => {
    // act
    const restrictions = restrictionsFor({
      eatingStyle: 'Vegan',
      allergiesOrIntolerances: 'Yes',
      allergiesOrIntolerancesList: ' Nuts, lactose ',
    });

    // assert
    expect(restrictions).toBe('Vegan, Nuts, lactose');
  });

  it('lists only her allergies when she eats everything', () => {
    // act
    const restrictions = restrictionsFor({
      eatingStyle: 'No restrictions',
      allergiesOrIntolerances: 'Yes',
      allergiesOrIntolerancesList: 'Lactose, mild',
    });

    // assert
    expect(restrictions).toBe('Lactose, mild');
  });

  it('ignores an allergy list she left blank or answered no to', () => {
    // act
    const blank = restrictionsFor({
      eatingStyle: 'No restrictions',
      allergiesOrIntolerances: 'Yes',
      allergiesOrIntolerancesList: '  ',
    });
    const declined = restrictionsFor({
      eatingStyle: 'No restrictions',
      allergiesOrIntolerances: 'No',
      allergiesOrIntolerancesList: 'Gluten',
    });

    // assert
    expect(blank).toBe('None');
    expect(declined).toBe('None');
  });
});
