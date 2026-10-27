import {
  MAX_VISITOR_NAME_LENGTH,
  MIN_BOOKING_AGE,
  VisitorBirthDate,
  VisitorCountries,
  type VisitorGender,
  type VisitorPhoneReading,
  type VisitorPrimaryGoal,
} from "~/bounded-contexts/scheduling/assessment-calls/domain/assessment-call";
import { z } from "zod";

import { wallClockCalendarDates } from "~/bounded-contexts/scheduling/assessment-calls/adapters/outbound/clock/wall-clock-calendar-dates";
import { COUNTRIES } from "~/shared/contact/countries";

export {
  MAX_BOOKING_AGE,
  MIN_BOOKING_AGE,
} from "~/bounded-contexts/scheduling/assessment-calls/domain/assessment-call";

export type ChoiceOption<Value extends string> = {
  readonly value: Value;
  readonly label: string;
};

export const VISITOR_GENDER_OPTIONS: readonly ChoiceOption<VisitorGender>[] = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

export const VISITOR_PRIMARY_GOAL_OPTIONS: readonly ChoiceOption<VisitorPrimaryGoal>[] =
  [
    { value: "lose_weight", label: "Lose weight" },
    { value: "build_muscle", label: "Build muscle" },
    { value: "build_strength", label: "Build strength" },
    {
      value: "maintain_improve_lifestyle",
      label: "Maintain but improve lifestyle",
    },
  ];

export const MAX_NOTES_LENGTH = 1000;

const VISITOR_COUNTRIES = VisitorCountries.of(COUNTRIES);

export const BOOKING_FIELD_MESSAGES = {
  birthDateImpossible: "Enter a real date of birth.",
  birthDateMissing: "Choose your date of birth.",
  birthDateTooYoung: `You must be at least ${MIN_BOOKING_AGE} to book a call.`,
  country: "Choose your country.",
  email: "Enter a valid email address.",
  firstName: `Enter your first name, up to ${MAX_VISITOR_NAME_LENGTH} characters.`,
  gender: "Choose an option.",
  lastName: `Enter your last name, up to ${MAX_VISITOR_NAME_LENGTH} characters.`,
  notes: `Keep your note under ${MAX_NOTES_LENGTH} characters.`,
  phone:
    "Enter a phone number with digits only, 4 to 14 digits after the country code.",
  primaryGoal: "Choose your primary goal.",
} as const;

export type BirthDateCheck = "ok" | "too_young" | "impossible";

export function nameSchema(message: string) {
  return z
    .string()
    .trim()
    .min(1, message)
    .max(MAX_VISITOR_NAME_LENGTH, message);
}

export function checkBirthDate(question: AgeQuestion): BirthDateCheck {
  const birthDate = VisitorBirthDate.parse(question.dateOfBirth);

  if (!birthDate) {
    return "impossible";
  }

  return BIRTH_DATE_CHECKS[
    birthDate.bookingProblemOn(question, wallClockCalendarDates) ?? "none"
  ];
}

export function birthDateMessage(check: BirthDateCheck): string | null {
  if (check === "too_young") {
    return BOOKING_FIELD_MESSAGES.birthDateTooYoung;
  }

  return check === "impossible"
    ? BOOKING_FIELD_MESSAGES.birthDateImpossible
    : null;
}

export function normalizeVisitorPhone(parts: {
  country: string;
  nationalNumber: string;
}): PhoneNormalization {
  return normalizationOf(VISITOR_COUNTRIES.phoneOf(parts));
}

export type PhoneNormalization =
  | { status: "empty" }
  | { status: "valid"; e164: string }
  | { status: "invalid" };

type AgeQuestion = {
  dateOfBirth: string;
  on: Date;
  timeZone: string;
};

const BIRTH_DATE_CHECKS: Readonly<
  Record<"none" | "too-young" | "impossible", BirthDateCheck>
> = {
  none: "ok",
  "too-young": "too_young",
  impossible: "impossible",
};

export function labelForGender(gender: VisitorGender): string {
  return labelFor(VISITOR_GENDER_OPTIONS, gender);
}

export function labelForPrimaryGoal(goal: VisitorPrimaryGoal): string {
  return labelFor(VISITOR_PRIMARY_GOAL_OPTIONS, goal);
}

export type PossessivePronoun = {
  readonly capitalised: string;
  readonly lower: string;
};

const POSSESSIVE_PRONOUNS: Readonly<Record<VisitorGender, PossessivePronoun>> =
  {
    female: { capitalised: "Her", lower: "her" },
    male: { capitalised: "His", lower: "his" },
    prefer_not_to_say: { capitalised: "Their", lower: "their" },
  };

export function possessivePronoun(gender: VisitorGender): PossessivePronoun {
  return POSSESSIVE_PRONOUNS[gender];
}

type SubjectPronoun = {
  readonly capitalised: string;
  readonly hasVerb: string;
  readonly isVerb: string;
  readonly lower: string;
  readonly regularVerbSuffix: string;
};

const SUBJECT_PRONOUNS: Readonly<Record<VisitorGender, SubjectPronoun>> = {
  female: {
    capitalised: "She",
    hasVerb: "has",
    isVerb: "is",
    lower: "she",
    regularVerbSuffix: "s",
  },
  male: {
    capitalised: "He",
    hasVerb: "has",
    isVerb: "is",
    lower: "he",
    regularVerbSuffix: "s",
  },
  prefer_not_to_say: {
    capitalised: "They",
    hasVerb: "have",
    isVerb: "are",
    lower: "they",
    regularVerbSuffix: "",
  },
};

export function subjectPronoun(gender: VisitorGender): SubjectPronoun {
  return SUBJECT_PRONOUNS[gender];
}

const OBJECT_PRONOUNS: Readonly<Record<VisitorGender, string>> = {
  female: "her",
  male: "him",
  prefer_not_to_say: "them",
};

export function objectPronoun(gender: VisitorGender): string {
  return OBJECT_PRONOUNS[gender];
}

export function ageOn(question: AgeQuestion): number {
  return (
    VisitorBirthDate.parse(question.dateOfBirth)?.ageOn(
      question,
      wallClockCalendarDates,
    ) ?? NaN
  );
}

export function formatAgeForCard(question: AgeQuestion): string {
  return `${ageOn(question)} (${formatBirthDate(question.dateOfBirth, "short")})`;
}

export function formatAgeForEmail(question: AgeQuestion): string {
  return `${ageOn(question)} (born ${formatBirthDate(question.dateOfBirth, "long")})`;
}

function labelFor<Value extends string>(
  options: readonly ChoiceOption<Value>[],
  value: Value,
): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

function normalizationOf(reading: VisitorPhoneReading): PhoneNormalization {
  return reading.status === "valid"
    ? { status: "valid", e164: reading.phone.toSnapshot().e164 }
    : reading;
}

function formatBirthDate(isoDate: string, month: "short" | "long"): string {
  const birth = VisitorBirthDate.parse(isoDate)?.toSnapshot();

  if (!birth) {
    throw new RangeError("A stored date of birth is not a calendar date.");
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month,
    timeZone: "UTC",
    year: "numeric",
  }).formatToParts(new Date(Date.UTC(birth.year, birth.month - 1, birth.day)));
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${read("day")} ${read("month")} ${read("year")}`;
}
