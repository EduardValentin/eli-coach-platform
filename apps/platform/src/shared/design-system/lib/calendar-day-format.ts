import { useDisplayTimeZone } from "./use-display-time-zone";

const CALENDAR_DAY_LOCALE = "en-GB";
const SERVER_RENDER_TIME_ZONE = "UTC";

export function useCalendarDayTimeZone(): string {
  return useDisplayTimeZone(SERVER_RENDER_TIME_ZONE);
}

export function formatDayMonth(instant: string, timeZone: string): string {
  return new Intl.DateTimeFormat(CALENDAR_DAY_LOCALE, {
    day: "numeric",
    month: "long",
    timeZone,
  }).format(new Date(instant));
}

export function formatDayMonthYear(instant: string, timeZone: string): string {
  return new Intl.DateTimeFormat(CALENDAR_DAY_LOCALE, {
    day: "numeric",
    month: "long",
    timeZone,
    year: "numeric",
  }).format(new Date(instant));
}
