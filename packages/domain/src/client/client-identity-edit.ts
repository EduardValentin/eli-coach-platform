import {
  MAX_BOOKING_AGE,
  MAX_VISITOR_NAME_LENGTH,
  MIN_BOOKING_AGE,
} from "../assessment-call";
import { instantToWallClock, type CalendarDate } from "../coach-availability";

import type { ClientIdentity } from "./client-identities";

export type ClientIdentityEditInput = Omit<ClientIdentity, "email">;

export type ClientIdentityProblems = {
  firstName?: "missing" | "too-long";
  lastName?: "missing" | "too-long";
  phone?: "invalid";
  dateOfBirth?: "impossible" | "too-young";
  country?: "invalid";
};

export type ClientIdentityEditResult =
  | { status: "valid"; edit: ClientIdentityEdit }
  | { status: "invalid"; problems: ClientIdentityProblems };

export type IdentityEditMoment = { on: Date; timeZone: string };

export type EditableClientIdentity = Pick<
  ClientIdentity,
  "firstName" | "lastName" | "phone" | "dateOfBirth" | "country"
>;

const E164_PHONE = /^\+[1-9]\d{4,14}$/;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const COUNTRY_CODE = /^[A-Z]{2}$/;

export class ClientIdentityEdit {
  private constructor(private readonly snapshot: ClientIdentityEditInput) {}

  static of(
    entered: ClientIdentityEditInput,
    moment: IdentityEditMoment,
  ): ClientIdentityEditResult {
    const edit = new ClientIdentityEdit({
      ...entered,
      firstName: entered.firstName.trim(),
      lastName: entered.lastName.trim(),
    });
    const problems = edit.problems(moment);

    return Object.keys(problems).length > 0
      ? { status: "invalid", problems }
      : { status: "valid", edit };
  }

  toSnapshot(): ClientIdentityEditInput {
    return { ...this.snapshot };
  }

  private problems(moment: IdentityEditMoment): ClientIdentityProblems {
    const { firstName, lastName, phone, country } = this.snapshot;
    const firstNameProblem = this.nameProblem(firstName);
    const lastNameProblem = this.nameProblem(lastName);
    const dateOfBirthProblem = this.dateOfBirthProblem(moment);

    return {
      ...(firstNameProblem && { firstName: firstNameProblem }),
      ...(lastNameProblem && { lastName: lastNameProblem }),
      ...(phone !== null && !E164_PHONE.test(phone) && { phone: "invalid" }),
      ...(dateOfBirthProblem && { dateOfBirth: dateOfBirthProblem }),
      ...(!COUNTRY_CODE.test(country) && { country: "invalid" }),
    };
  }

  private nameProblem(name: string): "missing" | "too-long" | null {
    if (name.length === 0) return "missing";

    return name.length > MAX_VISITOR_NAME_LENGTH ? "too-long" : null;
  }

  private dateOfBirthProblem(
    moment: IdentityEditMoment,
  ): "impossible" | "too-young" | null {
    const birth = this.birthDate();

    if (!birth) return "impossible";

    const age = this.ageOn(
      birth,
      instantToWallClock(moment.on, moment.timeZone),
    );

    if (age < 0 || age > MAX_BOOKING_AGE) return "impossible";

    return age < MIN_BOOKING_AGE ? "too-young" : null;
  }

  private birthDate(): CalendarDate | null {
    const match = ISO_DATE.exec(this.snapshot.dateOfBirth);

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

    return isCalendarDate ? { year, month, day } : null;
  }

  private ageOn(birth: CalendarDate, today: CalendarDate): number {
    const birthdayStillAhead =
      today.month < birth.month ||
      (today.month === birth.month && today.day < birth.day);

    return today.year - birth.year - (birthdayStillAhead ? 1 : 0);
  }
}
