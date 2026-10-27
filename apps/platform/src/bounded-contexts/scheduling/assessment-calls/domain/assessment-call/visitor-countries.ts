import { VisitorPhone, type VisitorPhoneReading } from "./visitor-phone";

type VisitorCountry = { code: string; callingCode: string };

export type VisitorPhoneEntry = { country: string; nationalNumber: string };

export class VisitorCountries {
  private constructor(
    private readonly callingCodes: ReadonlyMap<string, string>,
  ) {}

  static of(countries: readonly VisitorCountry[]): VisitorCountries {
    return new VisitorCountries(
      new Map(countries.map((country) => [country.code, country.callingCode])),
    );
  }

  includes(code: string): boolean {
    return this.callingCodes.has(code);
  }

  phoneOf(entry: VisitorPhoneEntry): VisitorPhoneReading {
    return VisitorPhone.read({
      callingCode: this.callingCodes.get(entry.country) ?? "",
      nationalNumber: entry.nationalNumber,
    });
  }
}
