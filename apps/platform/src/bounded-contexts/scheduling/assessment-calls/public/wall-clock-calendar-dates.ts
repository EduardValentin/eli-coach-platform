import type { CalendarDatesPort } from "~/bounded-contexts/scheduling/assessment-calls/domain/assessment-call";
import {
  completedYearsBetween,
  parseCalendarDate,
} from "~/shared/clock/calendar-date";
import { instantToWallClock } from "~/shared/clock/wall-clock";

export const wallClockCalendarDates: CalendarDatesPort = {
  dateOn: ({ on, timeZone }) => {
    const { year, month, day } = instantToWallClock(on, timeZone);

    return { year, month, day };
  },
  dateOf: parseCalendarDate,
  yearsBetween: completedYearsBetween,
};
