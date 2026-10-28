import type { CalendarDates } from "~/bounded-contexts/clients/clients/domain/client";
import {
  completedYearsBetween,
  parseCalendarDate,
} from "~/shared/clock/calendar-date";
import { instantToWallClock } from "~/shared/clock/wall-clock";

export const wallClockCalendarDates: CalendarDates = {
  dateOn: ({ on, timeZone }) => {
    const { year, month, day } = instantToWallClock(on, timeZone);

    return { year, month, day };
  },
  dateOf: parseCalendarDate,
  yearsBetween: completedYearsBetween,
};
