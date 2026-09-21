import { format, isValid, parseISO } from 'date-fns';
import { ageOnDate } from '../utils/bodyMetrics';

export const VISITOR_GENDERS = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
] as const;

export type VisitorGender = (typeof VISITOR_GENDERS)[number]['value'];

export const VISITOR_PRIMARY_GOALS = [
  { value: 'lose_weight', label: 'Lose weight' },
  { value: 'build_muscle', label: 'Build muscle' },
  { value: 'build_strength', label: 'Build strength' },
  { value: 'maintain_improve_lifestyle', label: 'Maintain but improve lifestyle' },
] as const;

export type VisitorPrimaryGoal = (typeof VISITOR_PRIMARY_GOALS)[number]['value'];

export const MIN_BOOKING_AGE = 18;
export const MAX_BOOKING_AGE = 120;

const MIN_NATIONAL_DIGITS = 4;
const MAX_NATIONAL_DIGITS = 14;
const MAX_E164_DIGITS = 15;
const PHONE_SEPARATORS = /[\s().-]/g;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type PhoneNormalization =
  | { status: 'empty' }
  | { status: 'valid'; e164: string }
  | { status: 'invalid' };

export type BirthDateCheck = 'ok' | 'too_young' | 'impossible';

export function labelForGender(gender: VisitorGender): string {
  return VISITOR_GENDERS.find((option) => option.value === gender)?.label ?? gender;
}

export function labelForPrimaryGoal(goal: VisitorPrimaryGoal): string {
  return VISITOR_PRIMARY_GOALS.find((option) => option.value === goal)?.label ?? goal;
}

export function normalizePhone(input: {
  callingCode: string;
  nationalNumber: string;
}): PhoneNormalization {
  const compact = input.nationalNumber.replace(PHONE_SEPARATORS, '');
  if (compact.length === 0) return { status: 'empty' };
  if (!/^\d+$/.test(compact)) return { status: 'invalid' };

  const national = compact.replace(/^0/, '');
  const countryDigits = input.callingCode.replace(/^\+/, '');
  const withinNationalBounds =
    national.length >= MIN_NATIONAL_DIGITS && national.length <= MAX_NATIONAL_DIGITS;
  const withinE164 = countryDigits.length + national.length <= MAX_E164_DIGITS;

  if (!withinNationalBounds || !withinE164) return { status: 'invalid' };

  return { status: 'valid', e164: `+${countryDigits}${national}` };
}

// Reads the booking day's local calendar date and re-expresses it at UTC
// midnight, so `ageOnDate`'s UTC arithmetic counts the visitor's own day.
function localCalendarDate(on: Date): Date {
  return new Date(Date.UTC(on.getFullYear(), on.getMonth(), on.getDate()));
}

function isRealCalendarDate(dateOfBirth: string): boolean {
  if (!ISO_DATE.test(dateOfBirth)) return false;
  const parsed = parseISO(dateOfBirth);
  return isValid(parsed) && format(parsed, 'yyyy-MM-dd') === dateOfBirth;
}

export function ageOn(dateOfBirth: string, on: Date): number {
  return ageOnDate(dateOfBirth, localCalendarDate(on));
}

export function checkBirthDate(dateOfBirth: string, on: Date): BirthDateCheck {
  if (!isRealCalendarDate(dateOfBirth)) return 'impossible';
  const age = ageOn(dateOfBirth, on);
  if (age > MAX_BOOKING_AGE || age < 0) return 'impossible';
  if (age < MIN_BOOKING_AGE) return 'too_young';
  return 'ok';
}

export function formatAgeForCard(dateOfBirth: string, on: Date): string {
  return `${ageOn(dateOfBirth, on)} (${format(parseISO(dateOfBirth), 'd MMM yyyy')})`;
}

export function formatAgeForEmail(dateOfBirth: string, on: Date): string {
  return `${ageOn(dateOfBirth, on)} (born ${format(parseISO(dateOfBirth), 'd MMMM yyyy')})`;
}
