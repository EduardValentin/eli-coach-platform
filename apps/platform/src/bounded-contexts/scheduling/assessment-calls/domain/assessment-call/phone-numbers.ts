type PhoneNumberReading =
  | { status: "empty" }
  | { status: "valid"; e164: string }
  | { status: "invalid" };

export interface PhoneNumbers {
  normalize(parts: {
    callingCode: string;
    nationalNumber: string;
  }): PhoneNumberReading;
}
