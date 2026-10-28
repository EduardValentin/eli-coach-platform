export const CLIENT_GENDERS = ["female", "male", "prefer_not_to_say"] as const;

export type ClientGender = (typeof CLIENT_GENDERS)[number];

export const CLIENT_PRIMARY_GOALS = [
  "lose_weight",
  "build_muscle",
  "build_strength",
  "maintain_improve_lifestyle",
] as const;

export type ClientPrimaryGoal = (typeof CLIENT_PRIMARY_GOALS)[number];

export const MAX_CLIENT_NAME_LENGTH = 60;

const MIN_CLIENT_AGE = 18;
const MAX_CLIENT_AGE = 120;

export type CalendarDate = { year: number; month: number; day: number };

export interface CalendarDates {
  dateOn(moment: { on: Date; timeZone: string }): CalendarDate;
  dateOf(isoDate: string): CalendarDate | null;
  yearsBetween(from: CalendarDate, to: CalendarDate): number;
}

type BirthDateProblem = "impossible" | "too-young";

export class ClientToday {
  private constructor(
    private readonly date: CalendarDate,
    private readonly calendar: CalendarDates,
  ) {}

  static on(
    moment: { on: Date; timeZone: string },
    calendar: CalendarDates,
  ): ClientToday {
    return new ClientToday(calendar.dateOn(moment), calendar);
  }

  birthDateProblemOf(isoDate: string): BirthDateProblem | null {
    const birthDate = this.calendar.dateOf(isoDate);

    if (!birthDate) return "impossible";

    const age = this.calendar.yearsBetween(birthDate, this.date);

    if (age < 0 || age > MAX_CLIENT_AGE) return "impossible";

    return age < MIN_CLIENT_AGE ? "too-young" : null;
  }
}

export type ClientPhoneEntry = { country: string; nationalNumber: string };

export type ClientPhoneReading =
  | { status: "empty" }
  | { status: "valid"; e164: string }
  | { status: "invalid" };

export interface PhoneNumbers {
  normalize(parts: {
    callingCode: string;
    nationalNumber: string;
  }): ClientPhoneReading;
}

type ClientCountry = { code: string; callingCode: string };

export class ClientCountries {
  private constructor(
    private readonly callingCodes: ReadonlyMap<string, string>,
    private readonly phoneNumbers: PhoneNumbers,
  ) {}

  static of(
    countries: readonly ClientCountry[],
    phoneNumbers: PhoneNumbers,
  ): ClientCountries {
    return new ClientCountries(
      new Map(countries.map((country) => [country.code, country.callingCode])),
      phoneNumbers,
    );
  }

  includes(code: string): boolean {
    return this.callingCodes.has(code);
  }

  phoneOf(entry: ClientPhoneEntry): ClientPhoneReading {
    return this.phoneNumbers.normalize({
      callingCode: this.callingCodes.get(entry.country) ?? "",
      nationalNumber: entry.nationalNumber,
    });
  }
}
