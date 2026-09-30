import type { OnboardingProfileFacts } from "../client-profile";

import type {
  OnboardingAnswer,
  OnboardingAnswersByForm,
  OnboardingFormAnswers,
} from "./onboarding-answers";

const GOAL_FIELD_IDS = {
  height: "height",
  weight: "weight",
  activityLevel: "lifestyleActivityLevel",
  primaryGoal: "primaryGoal",
  additionalInfo: "additionalInfo",
} as const;

const NUTRITION_FIELD_IDS = {
  eatingStyle: "eatingStyle",
  eatingStyleOther: "eatingStyleOther",
  allergies: "allergiesOrIntolerances",
  allergiesList: "allergiesOrIntolerancesList",
} as const;

const NO_RESTRICTIONS = "No restrictions";
const SOMETHING_ELSE = "Something else";
const HAS_ALLERGIES = "Yes";
const NO_DIETARY_RESTRICTIONS = "None";
const RESTRICTION_SEPARATOR = ", ";

function numberOf(answer: OnboardingAnswer | undefined): number | null {
  return typeof answer === "number" ? answer : null;
}

function textOf(answer: OnboardingAnswer | undefined): string | null {
  return typeof answer === "string" ? answer : null;
}

function trimmedTextOf(answer: OnboardingAnswer | undefined): string | null {
  const trimmed = textOf(answer)?.trim();

  return trimmed ? trimmed : null;
}

function eatingStyleRestriction(
  nutrition: OnboardingFormAnswers,
): string | null {
  const eatingStyle = textOf(nutrition[NUTRITION_FIELD_IDS.eatingStyle]);

  if (eatingStyle === SOMETHING_ELSE) {
    return (
      trimmedTextOf(nutrition[NUTRITION_FIELD_IDS.eatingStyleOther]) ??
      SOMETHING_ELSE
    );
  }

  return eatingStyle === NO_RESTRICTIONS ? null : eatingStyle;
}

function allergiesRestriction(nutrition: OnboardingFormAnswers): string | null {
  if (textOf(nutrition[NUTRITION_FIELD_IDS.allergies]) !== HAS_ALLERGIES) {
    return null;
  }

  return trimmedTextOf(nutrition[NUTRITION_FIELD_IDS.allergiesList]);
}

function dietaryRestrictionsOf(nutrition: OnboardingFormAnswers): string {
  const parts = [
    eatingStyleRestriction(nutrition),
    allergiesRestriction(nutrition),
  ].filter((part): part is string => part !== null);

  return parts.length > 0
    ? parts.join(RESTRICTION_SEPARATOR)
    : NO_DIETARY_RESTRICTIONS;
}

export function profileFactsOf(
  answers: OnboardingAnswersByForm,
): OnboardingProfileFacts {
  const goals = answers["goal-availability"] ?? {};

  return {
    heightCm: numberOf(goals[GOAL_FIELD_IDS.height]),
    startingWeightKg: numberOf(goals[GOAL_FIELD_IDS.weight]),
    activityLevel: textOf(goals[GOAL_FIELD_IDS.activityLevel]),
    primaryGoal: textOf(goals[GOAL_FIELD_IDS.primaryGoal]),
    dietaryRestrictions: dietaryRestrictionsOf(
      answers["nutrition-lifestyle"] ?? {},
    ),
    clientNotes: trimmedTextOf(goals[GOAL_FIELD_IDS.additionalInfo]),
  };
}
