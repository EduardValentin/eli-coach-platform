import { describe, expect, it } from 'vitest';
import {
  coachingFactsFromAnswers,
  editedProfile,
  measuredWeights,
  openedClientProfile,
  preferencesFromAnswers,
  type CoachingFacts,
} from './clientProfile';
import { EQUIPMENT } from './exercises';
import {
  emptyOnboardingDraft,
  type JourneyIdentity,
  type MeasurementEntry,
  type OnboardingDraft,
  type OnboardingFormAnswers,
} from './journey';

const IDENTITY: JourneyIdentity = {
  firstName: 'Ana',
  lastName: 'Popescu',
  dateOfBirth: '1994-03-14',
  email: 'ana@example.com',
  gender: 'female',
  country: 'Romania',
};

function measurement(weightKg: number, day: number): MeasurementEntry {
  return {
    id: `entry-${day}`,
    recordedAt: new Date(2026, 8, day),
    weightKg,
    waistCm: 74,
    photos: {},
  };
}

function draftWith(forms: {
  goal?: OnboardingFormAnswers;
  safety?: OnboardingFormAnswers;
  cycle?: OnboardingFormAnswers;
  food?: OnboardingFormAnswers;
}): OnboardingDraft {
  const empty = emptyOnboardingDraft();

  return {
    ...empty,
    answers: {
      ...empty.answers,
      'goal-availability': forms.goal ?? {},
      'safety-screening': forms.safety ?? {},
      'cycle-context': forms.cycle ?? {},
      'nutrition-lifestyle': forms.food ?? {},
    },
  };
}

function restrictionsFor(food: OnboardingFormAnswers) {
  return coachingFactsFromAnswers(draftWith({ food }), 'female').dietaryRestrictions;
}

function seededFacts(): CoachingFacts {
  return coachingFactsFromAnswers(
    draftWith({ goal: { height: 165, trainingDaysPerWeek: '4 days', minutesPerSession: '45–60 minutes' } }),
    'female',
  );
}

describe('seeding her coaching facts from her approved answers', () => {
  it('takes every coaching fact from the answers she sent', () => {
    // arrange
    const draft = draftWith({
      goal: {
        height: 165,
        goalWeight: 62,
        primaryGoal: 'Lose fat',
        experienceLevel: 'I train regularly, but without a structured plan',
        trainingDaysPerWeek: '3 days',
        minutesPerSession: '30–45 minutes',
        lifestyleActivityLevel: 'Mostly sitting',
        availableEquipment: ['Dumbbells', 'Resistance bands'],
        trainingPlace: 'Gym',
        additionalInfo: 'Night shifts twice a week.',
      },
      safety: { boneOrJointProblem: 'Yes', boneOrJointProblemList: ' Right shoulder aches. ' },
      cycle: { cycleRegularity: "Yes, and it's regular", hormonalContraception: 'None' },
      food: { eatingStyle: 'Vegetarian', allergiesOrIntolerances: 'No' },
    });

    // act
    const facts = coachingFactsFromAnswers(draft, 'female');

    // assert
    expect(facts).toEqual({
      heightCm: 165,
      trainingDays: 3,
      sessionMinutes: 45,
      equipment: ['Dumbbells', 'Bench', 'Bands'],
      trainingPlace: 'Gym',
      limitations: 'Right shoulder aches.',
      level: 'beginner',
      primaryGoal: 'Lose fat',
      goalWeightKg: 62,
      activityLevel: 'Mostly sitting',
      cycleMode: 'adapted',
      dietaryRestrictions: 'Vegetarian',
    });
  });

  it('makes her intermediate only when she follows a structured program, never advanced', () => {
    // arrange
    const experiences = [
      'I train consistently and follow a structured program',
      'I train regularly, but without a structured plan',
      'Returning after a break - 3-6 months',
      'New to training',
    ];

    // act
    const levels = experiences.map(
      (experienceLevel) => coachingFactsFromAnswers(draftWith({ goal: { experienceLevel } }), 'female').level,
    );

    // assert
    expect(levels).toEqual(['intermediate', 'beginner', 'beginner', 'beginner']);
  });

  it('maps training days and session minutes, with defaults when unanswered', () => {
    // arrange
    const dayAnswers = ['2 days', '3 days', '4 days', '5 or more days', ''];
    const minuteAnswers = ['Up to 30 minutes', '30–45 minutes', '45–60 minutes', ''];

    // act
    const days = dayAnswers.map(
      (trainingDaysPerWeek) => coachingFactsFromAnswers(draftWith({ goal: { trainingDaysPerWeek } }), 'female').trainingDays,
    );
    const minutes = minuteAnswers.map(
      (minutesPerSession) => coachingFactsFromAnswers(draftWith({ goal: { minutesPerSession } }), 'female').sessionMinutes,
    );

    // assert
    expect(days).toEqual([2, 3, 4, 5, 3]);
    expect(minutes).toEqual([30, 45, 60, 60]);
  });

  it('gives every library item for a full gym and nothing for bodyweight only', () => {
    // act
    const fullGym = coachingFactsFromAnswers(draftWith({ goal: { availableEquipment: ['Full gym'] } }), 'female');
    const bodyweight = coachingFactsFromAnswers(draftWith({ goal: { availableEquipment: ['Bodyweight only'] } }), 'female');

    // assert
    expect(fullGym.equipment).toEqual([...EQUIPMENT]);
    expect(bodyweight.equipment).toEqual([]);
  });

  it('keeps her limitations empty unless she answered yes to a bone or joint problem', () => {
    // act
    const declined = coachingFactsFromAnswers(
      draftWith({ safety: { boneOrJointProblem: 'No', boneOrJointProblemList: 'Knee' } }),
      'female',
    );

    // assert
    expect(declined.limitations).toBe('');
  });

  it('derives a general cycle mode for a man, the combined pill and menopause', () => {
    // act
    const modes = [
      coachingFactsFromAnswers(draftWith({}), 'male').cycleMode,
      coachingFactsFromAnswers(draftWith({ cycle: { hormonalContraception: 'Combined pill' } }), 'female').cycleMode,
      coachingFactsFromAnswers(draftWith({ cycle: { perimenopauseOrMenopause: 'Yes, menopause' } }), 'female').cycleMode,
    ];

    // assert
    expect(modes).toEqual(['general', 'general', 'general']);
  });
});

describe('seeding her preferences from her approved answers', () => {
  it('reads her check-in day and channel', () => {
    // arrange
    const draft = draftWith({ food: { checkInDay: 'Thursday', checkInChannel: 'WhatsApp' } });

    // act
    const settings = preferencesFromAnswers(draft);

    // assert
    expect(settings).toEqual({ preferredCheckInWeekday: 'thu', preferredChannel: 'whatsapp' });
  });

  it('leaves both empty when she did not answer them', () => {
    // act
    const settings = preferencesFromAnswers(draftWith({}));

    // assert
    expect(settings).toEqual({ preferredCheckInWeekday: null, preferredChannel: null });
  });
});

describe('editing her profile', () => {
  it('opens with her booking identity and no coaching facts', () => {
    // act
    const profile = openedClientProfile(IDENTITY);

    // assert
    expect(profile).toEqual({ identity: IDENTITY, avatarUrl: null, coaching: null, coachNotes: '' });
  });

  it('changes only the identity and coaching fields an edit names', () => {
    // arrange
    const profile = { ...openedClientProfile(IDENTITY), coaching: seededFacts() };

    // act
    const edited = editedProfile(profile, {
      identity: { firstName: 'Anna' },
      coaching: { trainingDays: 5, limitations: 'Left knee' },
      coachNotes: 'Prefers morning sessions.',
    });

    // assert
    expect(edited.identity).toEqual({ ...IDENTITY, firstName: 'Anna' });
    expect(edited.coaching).toEqual({ ...seededFacts(), trainingDays: 5, limitations: 'Left knee' });
    expect(edited.coachNotes).toBe('Prefers morning sessions.');
  });

  it('refuses coaching facts and notes before her answers are approved', () => {
    // arrange
    const profile = openedClientProfile(IDENTITY);

    // act
    const edited = editedProfile(profile, {
      identity: { lastName: 'Ionescu' },
      coaching: { trainingDays: 5 },
      coachNotes: 'Too early.',
    });

    // assert
    expect(edited).toEqual({ ...profile, identity: { ...IDENTITY, lastName: 'Ionescu' } });
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
