import type { PhoneNumbers } from "./phone-numbers";
import { VisitorPhone, type VisitorPhoneReading } from "./visitor-phone";

type VisitorCountry = { code: string; callingCode: string };

export type VisitorPhoneEntry = { country: string; nationalNumber: string };

export class VisitorCountries {
  private constructor(
    private readonly callingCodes: ReadonlyMap<string, string>,
    private readonly phoneNumbers: PhoneNumbers,
  ) {}

  static of(
    countries: readonly VisitorCountry[],
    phoneNumbers: PhoneNumbers,
  ): VisitorCountries {
    return new VisitorCountries(
      new Map(countries.map((country) => [country.code, country.callingCode])),
      phoneNumbers,
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
      this.phoneNumbers,
    );
  }
}
