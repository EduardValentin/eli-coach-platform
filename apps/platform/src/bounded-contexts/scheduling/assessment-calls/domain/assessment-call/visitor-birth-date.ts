import type { CalendarDate, CalendarDatesPort } from "./calendar-dates-port";
import { MAX_BOOKING_AGE, MIN_BOOKING_AGE } from "./visitor-profile";

type BirthDateProblem = "impossible" | "too-young";

export type AgeMoment = { on: Date; timeZone: string };

export class VisitorBirthDate {
  private constructor(private readonly date: CalendarDate) {}

  static parse(
    isoDate: string,
    calendar: CalendarDatesPort,
  ): VisitorBirthDate | null {
    const date = calendar.dateOf(isoDate);

    return date ? new VisitorBirthDate(date) : null;
  }

  ageOn(moment: AgeMoment, calendar: CalendarDatesPort): number {
    return calendar.yearsBetween(this.date, calendar.dateOn(moment));
  }

  bookingProblemOn(
    moment: AgeMoment,
    calendar: CalendarDatesPort,
  ): BirthDateProblem | null {
    const age = this.ageOn(moment, calendar);

    if (age < 0 || age > MAX_BOOKING_AGE) return "impossible";

    return age < MIN_BOOKING_AGE ? "too-young" : null;
  }

  toSnapshot(): CalendarDate {
    return { ...this.date };
  }
}
