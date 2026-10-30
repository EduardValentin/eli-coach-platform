import type {
  CalendarDate,
  CalendarDatesPort,
} from "~/bounded-contexts/clients/clients/domain/client";
import {
  completedYearsBetween,
  parseCalendarDate,
} from "~/shared/clock/calendar-date";
import { instantToWallClock } from "~/shared/clock/wall-clock";

export class WallClockCalendarDatesAdapter implements CalendarDatesPort {
  dateOn({ on, timeZone }: { on: Date; timeZone: string }): CalendarDate {
    const { year, month, day } = instantToWallClock(on, timeZone);

    return { year, month, day };
  }

  dateOf(isoDate: string): CalendarDate | null {
    return parseCalendarDate(isoDate);
  }

  yearsBetween(from: CalendarDate, to: CalendarDate): number {
    return completedYearsBetween(from, to);
  }
}
