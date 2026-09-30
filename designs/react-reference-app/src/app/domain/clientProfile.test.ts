import { describe, expect, it } from 'vitest';
import { profileFromOnboarding } from './clientProfile';
import {
  emptyOnboardingDraft,
  type JourneyIdentity,
  type MeasurementEntry,
  type OnboardingFormAnswers,
} from './journey';

const IDENTITY: JourneyIdentity = {
  firstName: 'Ana',
  lastName: 'Popescu',
  dateOfBirth: '1994-03-14',
  email: 'ana@example.com',
  phone: { diallingCode: '+40', number: '712345678' },
  gender: 'female',
  country: 'Romania',
  primaryGoal: 'lose_weight',
};

const LATEST_MEASUREMENT: MeasurementEntry = {
  recordedAt: new Date(2026, 8, 27),
  weightKg: 66.1,
  waistCm: 74,
};

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
  return profileFromOnboarding({
    identity: IDENTITY,
    answers: answersWith({ food }),
    latestMeasurement: null,
  }).dietaryRestrictions;
}

describe('building her profile from the onboarding she sent', () => {
  it('copies who she is from her booking', () => {
    // arrange
    const answers = answersWith({});

    // act
    const profile = profileFromOnboarding({
      identity: IDENTITY,
      answers,
      latestMeasurement: null,
    });

    // assert
    expect(profile).toMatchObject({
      firstName: 'Ana',
      lastName: 'Popescu',
      email: 'ana@example.com',
      dateOfBirth: '1994-03-14',
      gender: 'female',
      country: 'Romania',
      phone: { diallingCode: '+40', number: '712345678' },
    });
  });

  it('reads her height, starting weight, activity level, goal and notes from her first form', () => {
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
    const profile = profileFromOnboarding({
      identity: IDENTITY,
      answers,
      latestMeasurement: null,
    });

    // assert
    expect(profile).toMatchObject({
      heightCm: 165,
      startingWeightKg: 66.1,
      activityLevel: 'Mostly sitting',
      primaryGoal: 'Build muscle',
      clientNotes: 'Night shifts twice a week.',
    });
  });

  it('takes her current weight from her latest measurement', () => {
    // arrange
    const answers = answersWith({ goal: { weight: 67.4 } });

    // act
    const profile = profileFromOnboarding({
      identity: IDENTITY,
      answers,
      latestMeasurement: LATEST_MEASUREMENT,
    });

    // assert
    expect(profile.currentWeightKg).toBe(66.1);
  });

  it('leaves what she did not answer empty', () => {
    // arrange
    const answers = answersWith({
      goal: { height: '165', additionalInfo: '   ' },
    });

    // act
    const profile = profileFromOnboarding({
      identity: { ...IDENTITY, phone: undefined },
      answers,
      latestMeasurement: null,
    });

    // assert
    expect(profile).toMatchObject({
      phone: undefined,
      heightCm: null,
      startingWeightKg: null,
      currentWeightKg: null,
      activityLevel: null,
      primaryGoal: null,
      clientNotes: null,
    });
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
