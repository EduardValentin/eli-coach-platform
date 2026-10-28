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
}

type BirthDateProblem = "impossible" | "too-young";

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export class ClientBirthDate {
  private constructor(private readonly date: CalendarDate) {}

  static parse(isoDate: string): ClientBirthDate | null {
    const match = ISO_DATE.exec(isoDate);

    if (!match) return null;

    const [year, month, day] = match.slice(1).map(Number) as [
      number,
      number,
      number,
    ];
    const calendar = new Date(Date.UTC(year, month - 1, day));
    const isCalendarDate =
      calendar.getUTCFullYear() === year &&
      calendar.getUTCMonth() === month - 1 &&
      calendar.getUTCDate() === day;

    return isCalendarDate ? new ClientBirthDate({ year, month, day }) : null;
  }

  problemOn(today: CalendarDate): BirthDateProblem | null {
    const age = this.ageOn(today);

    if (age < 0 || age > MAX_CLIENT_AGE) return "impossible";

    return age < MIN_CLIENT_AGE ? "too-young" : null;
  }

  private ageOn(today: CalendarDate): number {
    const birthdayStillAhead =
      today.month < this.date.month ||
      (today.month === this.date.month && today.day < this.date.day);

    return today.year - this.date.year - (birthdayStillAhead ? 1 : 0);
  }
}

export type ClientPhoneEntry = { country: string; nationalNumber: string };

export type ClientPhoneReading =
  | { status: "empty" }
  | { status: "valid"; e164: string }
  | { status: "invalid" };

export interface PhoneNumbers {
  normalise(parts: {
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
    return this.phoneNumbers.normalise({
      callingCode: this.callingCodes.get(entry.country) ?? "",
      nationalNumber: entry.nationalNumber,
    });
  }
}
