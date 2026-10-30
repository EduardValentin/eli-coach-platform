import type { PhoneNumbersPort } from "./phone-numbers-port";
import { VisitorPhone, type VisitorPhoneReading } from "./visitor-phone";

type VisitorCountry = { code: string; callingCode: string };

export type VisitorPhoneEntry = { country: string; nationalNumber: string };

export class VisitorCountries {
  private constructor(
    private readonly callingCodes: ReadonlyMap<string, string>,
    private readonly phoneNumbersPort: PhoneNumbersPort,
  ) {}

  static of(
    countries: readonly VisitorCountry[],
    phoneNumbersPort: PhoneNumbersPort,
  ): VisitorCountries {
    return new VisitorCountries(
      new Map(countries.map((country) => [country.code, country.callingCode])),
      phoneNumbersPort,
    );
  }

  includes(code: string): boolean {
    return this.callingCodes.has(code);
  }

  phoneOf(entry: VisitorPhoneEntry): VisitorPhoneReading {
    return VisitorPhone.read(
      {
        callingCode: this.callingCodes.get(entry.country) ?? "",
        nationalNumber: entry.nationalNumber,
      },
      this.phoneNumbersPort,
    );
  }
}
