import type {
  VisitorGender,
  VisitorPrimaryGoal,
} from "@eli-coach-platform/domain/assessment-call";
import { z } from "zod";

import { findCountry } from "./countries";

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

export const MIN_BOOKING_AGE = 18;
export const MAX_BOOKING_AGE = 120;
const MAX_NAME_LENGTH = 60;
export const MAX_NOTES_LENGTH = 1000;

export const BOOKING_FIELD_MESSAGES = {
  birthDateImpossible: "Enter a real date of birth.",
  birthDateMissing: "Choose your date of birth.",
  birthDateTooYoung: "You must be at least 18 to book a call.",
  country: "Choose your country.",
  email: "Enter a valid email address.",
  firstName: `Enter your first name, up to ${MAX_NAME_LENGTH} characters.`,
  gender: "Choose an option.",
  lastName: `Enter your last name, up to ${MAX_NAME_LENGTH} characters.`,
  notes: `Keep your note under ${MAX_NOTES_LENGTH} characters.`,
  phone:
    "Enter a phone number with digits only, 4 to 14 digits after the country code.",
  primaryGoal: "Choose your primary goal.",
} as const;

export type BirthDateCheck = "ok" | "too_young" | "impossible";

export function nameSchema(message: string) {
  return z.string().trim().min(1, message).max(MAX_NAME_LENGTH, message);
}

export function checkBirthDate(question: AgeQuestion): BirthDateCheck {
  if (!ISO_DATE.test(question.dateOfBirth)) {
    return "impossible";
  }

  const age = ageOn(question);

  if (Number.isNaN(age) || age < 0 || age > MAX_BOOKING_AGE) {
    return "impossible";
  }

  return age < MIN_BOOKING_AGE ? "too_young" : "ok";
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
  return normalizePhone({
    callingCode: findCountry(parts.country)?.callingCode ?? "",
    nationalNumber: parts.nationalNumber,
  });
}

const MIN_NATIONAL_DIGITS = 4;
const MAX_NATIONAL_DIGITS = 14;
const MAX_E164_DIGITS = 15;
const PHONE_SEPARATORS = /[\s().-]/g;
const CALLING_CODE = /^\+\d{1,3}$/;
const NATIONAL_NUMBER = /^\d+$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type PhoneNormalization =
  | { status: "empty" }
  | { status: "valid"; e164: string }
  | { status: "invalid" };

type PhoneParts = {
  callingCode: string;
  nationalNumber: string;
};

type AgeQuestion = {
  dateOfBirth: string;
  on: Date;
  timeZone: string;
};

type CalendarDate = {
  year: number;
  month: number;
  day: number;
};

export function labelForGender(gender: VisitorGender): string {
  return labelFor(VISITOR_GENDER_OPTIONS, gender);
}

export function labelForPrimaryGoal(goal: VisitorPrimaryGoal): string {
  return labelFor(VISITOR_PRIMARY_GOAL_OPTIONS, goal);
}

export function normalizePhone(parts: PhoneParts): PhoneNormalization {
  const compact = parts.nationalNumber.replace(PHONE_SEPARATORS, "");

  if (compact.length === 0) {
    return { status: "empty" };
  }

  if (!CALLING_CODE.test(parts.callingCode) || !NATIONAL_NUMBER.test(compact)) {
    return { status: "invalid" };
  }

  const national = compact.replace(/^0/, "");
  const countryDigits = parts.callingCode.slice(1);
  const withinNationalBounds =
    national.length >= MIN_NATIONAL_DIGITS &&
    national.length <= MAX_NATIONAL_DIGITS;
  const withinE164 = countryDigits.length + national.length <= MAX_E164_DIGITS;

  if (!withinNationalBounds || !withinE164) {
    return { status: "invalid" };
  }

  return { status: "valid", e164: `+${countryDigits}${national}` };
}

export function ageOn(question: AgeQuestion): number {
  const birth = parseCalendarDate(question.dateOfBirth);
  const today = calendarDateIn(question.on, question.timeZone);
  const birthdayStillAhead =
    today.month < birth.month ||
    (today.month === birth.month && today.day < birth.day);

  return today.year - birth.year - (birthdayStillAhead ? 1 : 0);
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

function parseCalendarDate(isoDate: string): CalendarDate {
  const [year, month, day] = isoDate.split("-").map(Number);

  return { year: year ?? 0, month: month ?? 0, day: day ?? 0 };
}

function calendarDateIn(instant: Date, timeZone: string): CalendarDate {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "numeric",
    timeZone,
    year: "numeric",
  }).formatToParts(instant);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return { year: read("year"), month: read("month"), day: read("day") };
}

function formatBirthDate(isoDate: string, month: "short" | "long"): string {
  const birth = parseCalendarDate(isoDate);
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
