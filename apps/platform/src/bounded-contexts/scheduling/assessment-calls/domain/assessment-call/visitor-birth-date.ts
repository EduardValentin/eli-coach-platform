import type { CalendarDate, CalendarDatesPort } from "./calendar-dates-port";
import { MAX_BOOKING_AGE, MIN_BOOKING_AGE } from "./visitor-profile";

type BirthDateProblem = "impossible" | "too-young";

export type AgeMoment = { on: Date; timeZone: string };

export class VisitorBirthDate {
  private constructor(private readonly date: CalendarDate) {}

  static parse(
    isoDate: string,
    calendarDatesPort: CalendarDatesPort,
  ): VisitorBirthDate | null {
    const date = calendarDatesPort.dateOf(isoDate);

    return date ? new VisitorBirthDate(date) : null;
  }

  ageOn(moment: AgeMoment, calendarDatesPort: CalendarDatesPort): number {
    return calendarDatesPort.yearsBetween(
      this.date,
      calendarDatesPort.dateOn(moment),
    );
  }

  bookingProblemOn(
    moment: AgeMoment,
    calendarDatesPort: CalendarDatesPort,
  ): BirthDateProblem | null {
    const age = this.ageOn(moment, calendarDatesPort);

    if (age < 0 || age > MAX_BOOKING_AGE) return "impossible";

    return age < MIN_BOOKING_AGE ? "too-young" : null;
  }

  toSnapshot(): CalendarDate {
    return { ...this.date };
  }
}
