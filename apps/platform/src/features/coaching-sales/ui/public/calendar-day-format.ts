const CALENDAR_DAY_LOCALE = "en-GB";
const CALENDAR_DAY_ZONE = "UTC";

const dayMonth = new Intl.DateTimeFormat(CALENDAR_DAY_LOCALE, {
  day: "numeric",
  month: "long",
  timeZone: CALENDAR_DAY_ZONE,
});

const dayMonthYear = new Intl.DateTimeFormat(CALENDAR_DAY_LOCALE, {
  day: "numeric",
  month: "long",
  timeZone: CALENDAR_DAY_ZONE,
  year: "numeric",
});

export function formatDayMonth(calendarDay: string): string {
  return dayMonth.format(new Date(calendarDay));
}

export function formatDayMonthYear(calendarDay: string): string {
  return dayMonthYear.format(new Date(calendarDay));
}
