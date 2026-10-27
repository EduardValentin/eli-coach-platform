import type { CalendarDates } from "~/bounded-contexts/scheduling/assessment-calls/domain/assessment-call";
import { instantToWallClock } from "~/shared/clock/wall-clock";

export const wallClockCalendarDates: CalendarDates = {
  dateOn: ({ on, timeZone }) => {
    const { year, month, day } = instantToWallClock(on, timeZone);

    return { year, month, day };
  },
};
