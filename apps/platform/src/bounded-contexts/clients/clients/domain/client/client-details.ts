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

type CalendarDate = { year: number; month: number; day: number };

export type AgeMoment = { on: Date; timeZone: string };

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

  problemOn(moment: AgeMoment): BirthDateProblem | null {
    const age = this.ageOn(moment);

    if (age < 0 || age > MAX_CLIENT_AGE) return "impossible";

    return age < MIN_CLIENT_AGE ? "too-young" : null;
  }

  private ageOn(moment: AgeMoment): number {
    const today = this.calendarDateOf(moment);
    const birthdayStillAhead =
      today.month < this.date.month ||
      (today.month === this.date.month && today.day < this.date.day);

    return today.year - this.date.year - (birthdayStillAhead ? 1 : 0);
  }

  private calendarDateOf({ on, timeZone }: AgeMoment): CalendarDate {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(on);
    const part = (type: Intl.DateTimeFormatPartTypes) =>
      Number(parts.find((candidate) => candidate.type === type)?.value);

    return { year: part("year"), month: part("month"), day: part("day") };
  }
}

export type ClientPhoneEntry = { country: string; nationalNumber: string };

export type ClientPhoneReading =
  | { status: "empty" }
  | { status: "valid"; e164: string }
  | { status: "invalid" };

type ClientCountry = { code: string; callingCode: string };

const MIN_NATIONAL_DIGITS = 4;
const MAX_NATIONAL_DIGITS = 14;
const MAX_E164_DIGITS = 15;
const PHONE_SEPARATORS = /[\s().-]/g;
const CALLING_CODE = /^\+\d{1,3}$/;
const NATIONAL_NUMBER = /^\d+$/;

export class ClientCountries {
  private constructor(
    private readonly callingCodes: ReadonlyMap<string, string>,
  ) {}

  static of(countries: readonly ClientCountry[]): ClientCountries {
    return new ClientCountries(
      new Map(countries.map((country) => [country.code, country.callingCode])),
    );
  }

  includes(code: string): boolean {
    return this.callingCodes.has(code);
  }

  phoneOf(entry: ClientPhoneEntry): ClientPhoneReading {
    const callingCode = this.callingCodes.get(entry.country) ?? "";
    const compact = entry.nationalNumber.replace(PHONE_SEPARATORS, "");

    if (compact.length === 0) {
      return { status: "empty" };
    }

    if (!CALLING_CODE.test(callingCode) || !NATIONAL_NUMBER.test(compact)) {
      return { status: "invalid" };
    }

    const national = compact.replace(/^0/, "");
    const countryDigits = callingCode.slice(1);
    const withinNationalBounds =
      national.length >= MIN_NATIONAL_DIGITS &&
      national.length <= MAX_NATIONAL_DIGITS;
    const withinE164 =
      countryDigits.length + national.length <= MAX_E164_DIGITS;

    if (!withinNationalBounds || !withinE164) {
      return { status: "invalid" };
    }

    return { status: "valid", e164: `+${countryDigits}${national}` };
  }
}
