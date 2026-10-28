type PhoneNumberReading =
  | { status: "empty" }
  | { status: "valid"; e164: string }
  | { status: "invalid" };

export interface PhoneNumbers {
  normalise(parts: {
    callingCode: string;
    nationalNumber: string;
  }): PhoneNumberReading;
}
