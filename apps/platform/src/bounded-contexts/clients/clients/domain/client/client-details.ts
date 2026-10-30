import type { CalendarDate } from "./calendar-date";
import type { CalendarDatesPort } from "./calendar-dates-port";
import type { ClientPhoneReading } from "./client-phone-reading";
import type { PhoneNumbersPort } from "./phone-numbers-port";

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

type BirthDateProblem = "impossible" | "too-young";

export class ClientToday {
  private constructor(
    private readonly date: CalendarDate,
    private readonly calendarDatesPort: CalendarDatesPort,
  ) {}

  static on(
    moment: { on: Date; timeZone: string },
    calendarDatesPort: CalendarDatesPort,
  ): ClientToday {
    return new ClientToday(calendarDatesPort.dateOn(moment), calendarDatesPort);
  }

  birthDateProblemOf(isoDate: string): BirthDateProblem | null {
    const birthDate = this.calendarDatesPort.dateOf(isoDate);

    if (!birthDate) return "impossible";

    const age = this.calendarDatesPort.yearsBetween(birthDate, this.date);

    if (age < 0 || age > MAX_CLIENT_AGE) return "impossible";

    return age < MIN_CLIENT_AGE ? "too-young" : null;
  }
}

export type ClientPhoneEntry = { country: string; nationalNumber: string };

type ClientCountry = { code: string; callingCode: string };

export class ClientCountries {
  private constructor(
    private readonly callingCodes: ReadonlyMap<string, string>,
    private readonly phoneNumbersPort: PhoneNumbersPort,
  ) {}

  static of(
    countries: readonly ClientCountry[],
    phoneNumbersPort: PhoneNumbersPort,
  ): ClientCountries {
    return new ClientCountries(
      new Map(countries.map((country) => [country.code, country.callingCode])),
      phoneNumbersPort,
    );
  }

  includes(code: string): boolean {
    return this.callingCodes.has(code);
  }

  phoneOf(entry: ClientPhoneEntry): ClientPhoneReading {
    return this.phoneNumbersPort.normalize({
      callingCode: this.callingCodes.get(entry.country) ?? "",
      nationalNumber: entry.nationalNumber,
    });
  }
}
