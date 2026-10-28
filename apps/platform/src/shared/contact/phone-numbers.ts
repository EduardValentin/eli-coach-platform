export type PhoneNumberParts = { callingCode: string; nationalNumber: string };

export type PhoneNumberReading =
  | { status: "empty" }
  | { status: "valid"; e164: string }
  | { status: "invalid" };

const MIN_NATIONAL_DIGITS = 4;
const MAX_NATIONAL_DIGITS = 14;
const MAX_E164_DIGITS = 15;
const PHONE_SEPARATORS = /[\s().-]/g;
const CALLING_CODE = /^\+\d{1,3}$/;
const NATIONAL_NUMBER = /^\d+$/;

export function normalisePhone(parts: PhoneNumberParts): PhoneNumberReading {
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

export const phoneNumbers = { normalise: normalisePhone };
