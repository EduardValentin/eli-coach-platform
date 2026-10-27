import type { CalendarDate, CalendarDates } from "./calendar-dates";
import { MAX_BOOKING_AGE, MIN_BOOKING_AGE } from "./visitor-profile";

type BirthDateProblem = "impossible" | "too-young";

export type AgeMoment = { on: Date; timeZone: string };

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export class VisitorBirthDate {
  private constructor(private readonly date: CalendarDate) {}

  static parse(isoDate: string): VisitorBirthDate | null {
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

    return isCalendarDate ? new VisitorBirthDate({ year, month, day }) : null;
  }

  ageOn(moment: AgeMoment, calendar: CalendarDates): number {
    const today = calendar.dateOn(moment);
    const birthdayStillAhead =
      today.month < this.date.month ||
      (today.month === this.date.month && today.day < this.date.day);

    return today.year - this.date.year - (birthdayStillAhead ? 1 : 0);
  }

  bookingProblemOn(
    moment: AgeMoment,
    calendar: CalendarDates,
  ): BirthDateProblem | null {
    const age = this.ageOn(moment, calendar);

    if (age < 0 || age > MAX_BOOKING_AGE) return "impossible";

    return age < MIN_BOOKING_AGE ? "too-young" : null;
  }

  toSnapshot(): CalendarDate {
    return { ...this.date };
  }
}
