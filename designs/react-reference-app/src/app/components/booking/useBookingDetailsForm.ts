import { useState } from 'react';

export type BookingFieldErrors = {
  fullName?: string;
  email?: string;
  notes?: string;
};

export type BookingField = keyof BookingFieldErrors;

export type BookingDetailsForm = {
  fullName: string;
  email: string;
  notes: string;
  fieldErrors: BookingFieldErrors;
  setFullName: (value: string) => void;
  setEmail: (value: string) => void;
  setNotes: (value: string) => void;
  validate: () => BookingFieldErrors;
};

const FIELD_ORDER: readonly BookingField[] = ['fullName', 'email', 'notes'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NOTES_LENGTH = 1000;

const NAME_ERROR = 'Enter your full name, between 2 and 120 characters.';
const EMAIL_ERROR = 'Enter a valid email address.';
const NOTES_ERROR = `Keep your note under ${MAX_NOTES_LENGTH} characters.`;

function collectErrors(
  fullName: string,
  email: string,
  notes: string,
): BookingFieldErrors {
  const errors: BookingFieldErrors = {};
  const trimmedName = fullName.trim();

  if (trimmedName.length < 2 || trimmedName.length > 120) {
    errors.fullName = NAME_ERROR;
  }
  if (!EMAIL_PATTERN.test(email.trim())) {
    errors.email = EMAIL_ERROR;
  }
  if (notes.length > MAX_NOTES_LENGTH) {
    errors.notes = NOTES_ERROR;
  }

  return errors;
}

export function firstInvalidField(errors: BookingFieldErrors): BookingField | null {
  return FIELD_ORDER.find((field) => errors[field]) ?? null;
}

export function useBookingDetailsForm(): BookingDetailsForm {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [fieldErrors, setFieldErrors] = useState<BookingFieldErrors>({});

  const validate = () => {
    const errors = collectErrors(fullName, email, notes);
    setFieldErrors(errors);
    return errors;
  };

  return {
    fullName,
    email,
    notes,
    fieldErrors,
    setFullName,
    setEmail,
    setNotes,
    validate,
  };
}
