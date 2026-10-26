import type { VisitorGender } from "../assessment-call";
import { weekdayNamed } from "../coach-availability";
import {
  ACTIVITY_LEVELS,
  CLIENT_EQUIPMENT,
  CoachingFacts,
  PRIMARY_GOALS,
  TRAINING_PLACES,
  type ClientEquipment,
  type ClientLevel,
  type CoachingSeed,
  type SessionMinutes,
  type TrainingDays,
} from "../client-profile";
import type { ClientPreferences, PreferredChannel } from "../client-settings";

import type {
  OnboardingAnswer,
  OnboardingAnswersByForm,
  OnboardingFormAnswers,
} from "./onboarding-answers";
import { cycleModeOf } from "./onboarding-submission";

const STRUCTURED_EXPERIENCE =
  "I train consistently and follow a structured program";
const HAS_BONE_OR_JOINT_PROBLEM = "Yes";
const NO_RESTRICTIONS = "No restrictions";
const SOMETHING_ELSE = "Something else";
const HAS_ALLERGIES = "Yes";
const NO_DIETARY_RESTRICTIONS = "None";
const RESTRICTION_SEPARATOR = ", ";
const DEFAULT_TRAINING_DAYS: TrainingDays = 3;
const DEFAULT_SESSION_MINUTES: SessionMinutes = 60;

const TRAINING_DAYS_BY_ANSWER: Readonly<Record<string, TrainingDays>> = {
  "2 days": 2,
  "3 days": 3,
  "4 days": 4,
  "5 or more days": 5,
};

const SESSION_MINUTES_BY_ANSWER: Readonly<Record<string, SessionMinutes>> = {
  "Up to 30 minutes": 30,
  "30–45 minutes": 45,
  "45–60 minutes": 60,
};

const CHANNELS_BY_ANSWER: Readonly<Record<string, PreferredChannel>> = {
  Email: "email",
  WhatsApp: "whatsapp",
};

function numberOf(answer: OnboardingAnswer | undefined): number | null {
  return typeof answer === "number" ? answer : null;
}

function textOf(answer: OnboardingAnswer | undefined): string | null {
  const trimmed = typeof answer === "string" ? answer.trim() : "";

  return trimmed ? trimmed : null;
}

function listOf(answer: OnboardingAnswer | undefined): string[] {
  return Array.isArray(answer) ? answer : [];
}

function mappedAnswer<Value>(
  byAnswer: Readonly<Record<string, Value>>,
  answer: OnboardingAnswer | undefined,
): Value | null {
  const text = textOf(answer);

  return text === null ? null : (byAnswer[text] ?? null);
}

function oneOf<Value extends string>(
  vocabulary: readonly Value[],
  answer: OnboardingAnswer | undefined,
): Value | null {
  return vocabulary.find((known) => known === textOf(answer)) ?? null;
}

function levelOf(experience: OnboardingAnswer | undefined): ClientLevel {
  return textOf(experience) === STRUCTURED_EXPERIENCE
    ? "intermediate"
    : "beginner";
}

function limitationsOf(safety: OnboardingFormAnswers): string {
  if (safety.boneOrJointProblem !== HAS_BONE_OR_JOINT_PROBLEM) return "";

  return textOf(safety.boneOrJointProblemList) ?? "";
}

function eatingStyleRestriction(
  nutrition: OnboardingFormAnswers,
): string | null {
  const eatingStyle = textOf(nutrition.eatingStyle);

  if (eatingStyle === SOMETHING_ELSE) {
    return textOf(nutrition.eatingStyleOther) ?? SOMETHING_ELSE;
  }

  return eatingStyle === NO_RESTRICTIONS ? null : eatingStyle;
}

function allergiesRestriction(nutrition: OnboardingFormAnswers): string | null {
  if (textOf(nutrition.allergiesOrIntolerances) !== HAS_ALLERGIES) {
    return null;
  }

  return textOf(nutrition.allergiesOrIntolerancesList);
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

function preferencesOf(lifestyle: OnboardingFormAnswers): ClientPreferences {
  const checkInDay = textOf(lifestyle.checkInDay);

  return {
    preferredCheckInWeekday: checkInDay ? weekdayNamed(checkInDay) : null,
    preferredChannel: mappedAnswer(
      CHANNELS_BY_ANSWER,
      lifestyle.checkInChannel,
    ),
  };
}

export function coachingSeedOf(
  answers: OnboardingAnswersByForm,
  gender: VisitorGender,
): CoachingSeed {
  const goal = answers["goal-availability"];
  const lifestyle = answers["nutrition-lifestyle"];
  const coaching = CoachingFacts.seeded({
    heightCm: numberOf(goal.height),
    trainingDays:
      mappedAnswer(TRAINING_DAYS_BY_ANSWER, goal.trainingDaysPerWeek) ??
      DEFAULT_TRAINING_DAYS,
    sessionMinutes:
      mappedAnswer(SESSION_MINUTES_BY_ANSWER, goal.minutesPerSession) ??
      DEFAULT_SESSION_MINUTES,
    equipment: listOf(goal.availableEquipment).filter(
      (answer): answer is ClientEquipment =>
        CLIENT_EQUIPMENT.some((item) => item === answer),
    ),
    trainingPlace: oneOf(TRAINING_PLACES, goal.trainingPlace),
    limitations: limitationsOf(answers["safety-screening"]),
    level: levelOf(goal.experienceLevel),
    primaryGoal: oneOf(PRIMARY_GOALS, goal.primaryGoal),
    goalWeightKg: numberOf(goal.goalWeight),
    activityLevel: oneOf(ACTIVITY_LEVELS, goal.lifestyleActivityLevel),
    cycleMode: cycleModeOf(answers, gender) ?? "general",
    dietaryRestrictions: dietaryRestrictionsOf(lifestyle),
  });

  return {
    coaching: coaching.toSnapshot(),
    preferences: preferencesOf(lifestyle),
  };
}
