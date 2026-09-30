import type {
  ClientJourney,
  JourneyGender,
  JourneyIdentity,
  JourneyPhone,
  MeasurementEntry,
  OnboardingAnswer,
  OnboardingDraft,
  OnboardingFormAnswers,
} from './journey';

export type JourneyProfile = {
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  gender: JourneyGender;
  country: string;
  phone?: JourneyPhone;
  heightCm: number | null;
  startingWeightKg: number | null;
  currentWeightKg: number | null;
  activityLevel: string | null;
  primaryGoal: string | null;
  dietaryRestrictions: string;
  clientNotes: string | null;
};

export type ProfileSources = {
  identity: JourneyIdentity;
  answers: OnboardingDraft['answers'];
  latestMeasurement: MeasurementEntry | null;
};

const NO_RESTRICTIONS = 'No restrictions';
const OWN_EATING_STYLE = 'Something else';
const HAS_ALLERGIES = 'Yes';
const NO_DIETARY_RESTRICTIONS = 'None';

function numberAnswer(answer: OnboardingAnswer | undefined): number | null {
  return typeof answer === 'number' ? answer : null;
}

function textAnswer(answer: OnboardingAnswer | undefined): string | null {
  if (typeof answer !== 'string') return null;

  const trimmed = answer.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function eatingStyleRestriction(food: OnboardingFormAnswers): string | null {
  const eatingStyle = textAnswer(food.eatingStyle);

  if (eatingStyle === OWN_EATING_STYLE) {
    return textAnswer(food.eatingStyleOther) ?? OWN_EATING_STYLE;
  }
  if (eatingStyle === NO_RESTRICTIONS) return null;

  return eatingStyle;
}

function allergyRestriction(food: OnboardingFormAnswers): string | null {
  if (food.allergiesOrIntolerances !== HAS_ALLERGIES) return null;

  return textAnswer(food.allergiesOrIntolerancesList);
}

function dietaryRestrictions(food: OnboardingFormAnswers): string {
  const restrictions = [
    eatingStyleRestriction(food),
    allergyRestriction(food),
  ].filter((restriction) => restriction !== null);

  return restrictions.length > 0
    ? restrictions.join(', ')
    : NO_DIETARY_RESTRICTIONS;
}

export function profileFromOnboarding({
  identity,
  answers,
  latestMeasurement,
}: ProfileSources): JourneyProfile {
  const goal = answers['goal-availability'];

  return {
    firstName: identity.firstName,
    lastName: identity.lastName,
    email: identity.email,
    dateOfBirth: identity.dateOfBirth,
    gender: identity.gender,
    country: identity.country,
    phone: identity.phone,
    heightCm: numberAnswer(goal.height),
    startingWeightKg: numberAnswer(goal.weight),
    currentWeightKg: latestMeasurement?.weightKg ?? null,
    activityLevel: textAnswer(goal.lifestyleActivityLevel),
    primaryGoal: textAnswer(goal.primaryGoal),
    dietaryRestrictions: dietaryRestrictions(answers['nutrition-lifestyle']),
    clientNotes: textAnswer(goal.additionalInfo),
  };
}

export function profileOfJourney(journey: ClientJourney): JourneyProfile {
  return profileFromOnboarding({
    identity: journey.identity,
    answers: journey.onboarding.answers,
    latestMeasurement: journey.measurements.at(-1) ?? null,
  });
}
