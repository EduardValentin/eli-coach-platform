import type { IdentityEdit } from '../../domain/clientProfile';
import type { JourneyGender, JourneyIdentity, JourneyPhone } from '../../domain/journey';
import { COUNTRIES, findCountry } from '../../services/countries';
import { checkBirthDate, MIN_BOOKING_AGE, normalizePhone } from '../../services/visitorProfile';
import { asText, type OnboardingValues } from '../client-portal/onboarding/onboardingValues';

export const IDENTITY_PROBLEMS = {
  dateOfBirthMissing: 'Choose a date of birth.',
  dateOfBirthTooYoung: `Choose a date at least ${MIN_BOOKING_AGE} years ago.`,
  dateOfBirthImpossible: 'Enter a real date of birth.',
  phone: 'Enter a phone number with digits only, 4 to 14 digits after the country code.',
} as const;

const NATIONAL_PREFIX = /^0/;
const PHONE_SEPARATORS = /[\s().-]/g;

function countryCodeNamed(name: string): string {
  return COUNTRIES.find((country) => country.name === name)?.code ?? '';
}

function phoneCountryOf(identity: JourneyIdentity): string {
  const dialled = COUNTRIES.filter((country) => country.callingCode === identity.phone?.diallingCode);
  const home = countryCodeNamed(identity.country);

  return dialled.find((country) => country.code === home)?.code ?? dialled[0]?.code ?? home;
}

export function identityValues(identity: JourneyIdentity): OnboardingValues {
  return {
    firstName: identity.firstName,
    lastName: identity.lastName,
    dateOfBirth: identity.dateOfBirth,
    country: countryCodeNamed(identity.country),
    gender: identity.gender,
    phoneCountry: phoneCountryOf(identity),
    phoneNumber: identity.phone?.number ?? '',
  };
}

export function dateOfBirthProblem(dateOfBirth: string, today: Date): string | true {
  if (dateOfBirth.length === 0) return IDENTITY_PROBLEMS.dateOfBirthMissing;

  const check = checkBirthDate(dateOfBirth, today);
  if (check === 'too_young') return IDENTITY_PROBLEMS.dateOfBirthTooYoung;
  if (check === 'impossible') return IDENTITY_PROBLEMS.dateOfBirthImpossible;

  return true;
}

function callingCodeOf(values: OnboardingValues): string {
  return findCountry(asText(values.phoneCountry))?.callingCode ?? '';
}

export function phoneProblem(values: OnboardingValues): string | true {
  const callingCode = callingCodeOf(values);
  const phone = normalizePhone({ callingCode, nationalNumber: asText(values.phoneNumber) });

  if (phone.status === 'empty') return true;
  if (phone.status === 'invalid' || callingCode.length === 0) return IDENTITY_PROBLEMS.phone;

  return true;
}

function phoneOf(values: OnboardingValues): JourneyPhone | undefined {
  const number = asText(values.phoneNumber).replace(PHONE_SEPARATORS, '').replace(NATIONAL_PREFIX, '');

  return number.length > 0 ? { diallingCode: callingCodeOf(values), number } : undefined;
}

export function sharedIdentityOf(values: OnboardingValues): IdentityEdit {
  return {
    firstName: asText(values.firstName).trim(),
    lastName: asText(values.lastName).trim(),
    dateOfBirth: asText(values.dateOfBirth),
    country: findCountry(asText(values.country))?.name ?? '',
    phone: phoneOf(values),
  };
}

export function coachIdentityOf(values: OnboardingValues): IdentityEdit {
  return { ...sharedIdentityOf(values), gender: asText(values.gender) as JourneyGender };
}
