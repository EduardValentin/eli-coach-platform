import { useState } from 'react';
import { findCountry } from '../../services/countries';
import {
  checkBirthDate,
  normalizePhone,
  type VisitorGender,
  type VisitorPrimaryGoal,
} from '../../services/visitorProfile';

export type BookingFieldErrors = {
  firstName?: string;
  lastName?: string;
  email?: string;
  dateOfBirth?: string;
  gender?: string;
  primaryGoal?: string;
  country?: string;
  phone?: string;
  notes?: string;
};

export type BookingField = keyof BookingFieldErrors;

export type BookingDetailsValues = {
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  gender: VisitorGender | '';
  primaryGoal: VisitorPrimaryGoal | '';
  country: string;
  phoneCountry: string;
  phoneNumber: string;
  notes: string;
};

export type ValidatedVisitorProfile = {
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  gender: VisitorGender;
  primaryGoal: VisitorPrimaryGoal;
  country: string;
  phone: string | null;
  notes: string;
};

export type BookingDetailsForm = BookingDetailsValues & {
  fieldErrors: BookingFieldErrors;
  validatedProfile: () => ValidatedVisitorProfile | null;
  setFirstName: (value: string) => void;
  setLastName: (value: string) => void;
  setEmail: (value: string) => void;
  setDateOfBirth: (value: string) => void;
  setGender: (value: VisitorGender) => void;
  setPrimaryGoal: (value: VisitorPrimaryGoal) => void;
  setCountry: (value: string) => void;
  setPhoneCountry: (value: string) => void;
  setPhoneNumber: (value: string) => void;
  setNotes: (value: string) => void;
  validate: () => BookingFieldErrors;
};

const FIELD_ORDER: readonly BookingField[] = [
  'firstName',
  'lastName',
  'email',
  'dateOfBirth',
  'gender',
  'primaryGoal',
  'country',
  'phone',
  'notes',
];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME_LENGTH = 60;
const MAX_NOTES_LENGTH = 1000;

export const BOOKING_FIELD_ERRORS = {
  firstName: `Enter your first name, up to ${MAX_NAME_LENGTH} characters.`,
  lastName: `Enter your last name, up to ${MAX_NAME_LENGTH} characters.`,
  email: 'Enter a valid email address.',
  dateOfBirthMissing: 'Choose your date of birth.',
  dateOfBirthTooYoung: 'You must be at least 18 to book a call.',
  dateOfBirthImpossible: 'Enter a real date of birth.',
  gender: 'Choose an option.',
  primaryGoal: 'Choose your primary goal.',
  country: 'Choose your country.',
  phone: 'Enter a phone number with digits only, 4 to 14 digits after the country code.',
  notes: `Keep your note under ${MAX_NOTES_LENGTH} characters.`,
} as const;

const EMPTY_VALUES: BookingDetailsValues = {
  firstName: '',
  lastName: '',
  email: '',
  dateOfBirth: '',
  gender: '',
  primaryGoal: '',
  country: '',
  phoneCountry: '',
  phoneNumber: '',
  notes: '',
};

function isValidName(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length >= 1 && trimmed.length <= MAX_NAME_LENGTH;
}

function dateOfBirthError(dateOfBirth: string): string | undefined {
  if (dateOfBirth.length === 0) return BOOKING_FIELD_ERRORS.dateOfBirthMissing;
  const check = checkBirthDate(dateOfBirth, new Date());
  if (check === 'too_young') return BOOKING_FIELD_ERRORS.dateOfBirthTooYoung;
  if (check === 'impossible') return BOOKING_FIELD_ERRORS.dateOfBirthImpossible;
  return undefined;
}

function phoneError(values: BookingDetailsValues): string | undefined {
  const callingCode = findCountry(values.phoneCountry)?.callingCode ?? '';
  const phone = normalizePhone({ callingCode, nationalNumber: values.phoneNumber });
  if (phone.status === 'empty') return undefined;
  if (phone.status === 'invalid' || callingCode.length === 0) {
    return BOOKING_FIELD_ERRORS.phone;
  }
  return undefined;
}

export function collectBookingErrors(values: BookingDetailsValues): BookingFieldErrors {
  const errors: BookingFieldErrors = {};

  if (!isValidName(values.firstName)) errors.firstName = BOOKING_FIELD_ERRORS.firstName;
  if (!isValidName(values.lastName)) errors.lastName = BOOKING_FIELD_ERRORS.lastName;
  if (!EMAIL_PATTERN.test(values.email.trim())) errors.email = BOOKING_FIELD_ERRORS.email;

  const birthDate = dateOfBirthError(values.dateOfBirth);
  if (birthDate) errors.dateOfBirth = birthDate;

  if (values.gender === '') errors.gender = BOOKING_FIELD_ERRORS.gender;
  if (values.primaryGoal === '') errors.primaryGoal = BOOKING_FIELD_ERRORS.primaryGoal;
  if (!findCountry(values.country)) errors.country = BOOKING_FIELD_ERRORS.country;

  const phone = phoneError(values);
  if (phone) errors.phone = phone;

  if (values.notes.length > MAX_NOTES_LENGTH) errors.notes = BOOKING_FIELD_ERRORS.notes;

  return errors;
}

export function firstInvalidField(errors: BookingFieldErrors): BookingField | null {
  return FIELD_ORDER.find((field) => errors[field]) ?? null;
}

function submittedPhone(values: BookingDetailsValues): string | null {
  const callingCode = findCountry(values.phoneCountry)?.callingCode ?? '';
  const phone = normalizePhone({ callingCode, nationalNumber: values.phoneNumber });
  return phone.status === 'valid' ? phone.e164 : null;
}

// Only a form that passed `collectBookingErrors` reaches here, so the empty
// select placeholders have already been refused and the narrowing holds.
function validatedProfileOf(values: BookingDetailsValues): ValidatedVisitorProfile | null {
  if (Object.keys(collectBookingErrors(values)).length > 0) return null;
  if (values.gender === '' || values.primaryGoal === '') return null;

  return {
    firstName: values.firstName,
    lastName: values.lastName,
    email: values.email,
    dateOfBirth: values.dateOfBirth,
    gender: values.gender,
    primaryGoal: values.primaryGoal,
    country: values.country,
    phone: submittedPhone(values),
    notes: values.notes,
  };
}

export function useBookingDetailsForm(): BookingDetailsForm {
  const [values, setValues] = useState<BookingDetailsValues>(EMPTY_VALUES);
  const [phoneCountryChosen, setPhoneCountryChosen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<BookingFieldErrors>({});

  const update = (patch: Partial<BookingDetailsValues>) =>
    setValues((current) => ({ ...current, ...patch }));

  const setCountry = (country: string) =>
    setValues((current) => ({
      ...current,
      country,
      phoneCountry: phoneCountryChosen ? current.phoneCountry : country,
    }));

  const setPhoneCountry = (phoneCountry: string) => {
    setPhoneCountryChosen(true);
    update({ phoneCountry });
  };

  const validate = () => {
    const errors = collectBookingErrors(values);
    setFieldErrors(errors);
    return errors;
  };

  return {
    ...values,
    fieldErrors,
    validatedProfile: () => validatedProfileOf(values),
    setFirstName: (firstName) => update({ firstName }),
    setLastName: (lastName) => update({ lastName }),
    setEmail: (email) => update({ email }),
    setDateOfBirth: (dateOfBirth) => update({ dateOfBirth }),
    setGender: (gender) => update({ gender }),
    setPrimaryGoal: (primaryGoal) => update({ primaryGoal }),
    setCountry,
    setPhoneCountry,
    setPhoneNumber: (phoneNumber) => update({ phoneNumber }),
    setNotes: (notes) => update({ notes }),
    validate,
  };
}
