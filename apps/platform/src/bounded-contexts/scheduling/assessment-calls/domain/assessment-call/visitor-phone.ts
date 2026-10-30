import type { PhoneNumbersPort } from "./phone-numbers-port";

export type VisitorPhoneParts = { callingCode: string; nationalNumber: string };

export type VisitorPhoneReading =
  | { status: "empty" }
  | { status: "valid"; phone: VisitorPhone }
  | { status: "invalid" };

export type VisitorPhoneSnapshot = { e164: string };

export class VisitorPhone {
  private constructor(private readonly snapshot: VisitorPhoneSnapshot) {}

  static read(
    parts: VisitorPhoneParts,
    phoneNumbersPort: PhoneNumbersPort,
  ): VisitorPhoneReading {
    const reading = phoneNumbersPort.normalize(parts);

    return reading.status === "valid"
      ? { status: "valid", phone: new VisitorPhone({ e164: reading.e164 }) }
      : reading;
  }

  toSnapshot(): VisitorPhoneSnapshot {
    return { ...this.snapshot };
  }
}
