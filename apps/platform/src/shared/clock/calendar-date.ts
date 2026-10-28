type CalendarDate = { year: number; month: number; day: number };

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseCalendarDate(isoDate: string): CalendarDate | null {
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

  return isCalendarDate ? { year, month, day } : null;
}

export function completedYearsBetween(
  from: CalendarDate,
  to: CalendarDate,
): number {
  const anniversaryStillAhead =
    to.month < from.month || (to.month === from.month && to.day < from.day);

  return to.year - from.year - (anniversaryStillAhead ? 1 : 0);
}
