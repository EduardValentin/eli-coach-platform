import type {
  ClientJourney,
  MeasurementEntry,
  OnboardingAnswer,
  OnboardingDraft,
  OnboardingFormAnswers,
} from './journey';

export type JourneyProfile = {
  heightCm: number | null;
  activityLevel: string | null;
  primaryGoal: string | null;
  dietaryRestrictions: string;
  clientNotes: string | null;
};

export type MeasuredWeights = {
  startingWeightKg: number | null;
  currentWeightKg: number | null;
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

export function profileFromOnboarding(
  answers: OnboardingDraft['answers'],
): JourneyProfile {
  const goal = answers['goal-availability'];

  return {
    heightCm: numberAnswer(goal.height),
    activityLevel: textAnswer(goal.lifestyleActivityLevel),
    primaryGoal: textAnswer(goal.primaryGoal),
    dietaryRestrictions: dietaryRestrictions(answers['nutrition-lifestyle']),
    clientNotes: textAnswer(goal.additionalInfo),
  };
}

export function profileOfJourney(journey: ClientJourney): JourneyProfile {
  return profileFromOnboarding(journey.onboarding.answers);
}

export function measuredWeights(
  measurements: readonly MeasurementEntry[],
): MeasuredWeights {
  return {
    startingWeightKg: measurements.at(0)?.weightKg ?? null,
    currentWeightKg: measurements.at(-1)?.weightKg ?? null,
  };
}
