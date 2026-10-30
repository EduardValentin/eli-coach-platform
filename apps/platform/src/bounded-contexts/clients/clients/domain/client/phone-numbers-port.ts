import type { ClientPhoneReading } from "./client-phone-reading";

export interface PhoneNumbersPort {
  normalize(parts: {
    callingCode: string;
    nationalNumber: string;
  }): ClientPhoneReading;
}
