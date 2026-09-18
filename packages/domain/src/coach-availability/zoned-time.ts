export type CalendarDate = {
  year: number;
  month: number;
  day: number;
};

export type WallClock = CalendarDate & {
  hour: number;
  minute: number;
  second: number;
};

export type WallClockHour = CalendarDate & {
  timeZone: string;
  hour: number;
};

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1_000;

const formatters = new Map<string, Intl.DateTimeFormat>();

export function instantToWallClock(instant: Date, timeZone: string): WallClock {
  const parts = formatterFor(timeZone).formatToParts(instant);

  return {
    year: partValue(parts, "year"),
    month: partValue(parts, "month"),
    day: partValue(parts, "day"),
    hour: partValue(parts, "hour"),
    minute: partValue(parts, "minute"),
    second: partValue(parts, "second"),
  };
}

export function wallClockToInstant(wallClockHour: WallClockHour): Date {
  const asUtc = Date.UTC(
    wallClockHour.year,
    wallClockHour.month - 1,
    wallClockHour.day,
    wallClockHour.hour,
  );
  const firstPass = new Date(
    asUtc - zoneOffsetMs(new Date(asUtc), wallClockHour.timeZone),
  );

  return new Date(asUtc - zoneOffsetMs(firstPass, wallClockHour.timeZone));
}

export function addDays(date: CalendarDate, days: number): CalendarDate {
  const shifted = new Date(epochDayStart(date) + days * MILLISECONDS_PER_DAY);

  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

export function weekdayIndexOf(date: CalendarDate): number {
  return new Date(epochDayStart(date)).getUTCDay();
}

export function compareCalendarDates(
  left: CalendarDate,
  right: CalendarDate,
): number {
  return epochDayStart(left) - epochDayStart(right);
}

function epochDayStart(date: CalendarDate): number {
  return Date.UTC(date.year, date.month - 1, date.day);
}

function zoneOffsetMs(instant: Date, timeZone: string): number {
  const wallClock = instantToWallClock(instant, timeZone);

  return (
    Date.UTC(
      wallClock.year,
      wallClock.month - 1,
      wallClock.day,
      wallClock.hour,
      wallClock.minute,
      wallClock.second,
    ) - instant.getTime()
  );
}

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  const cached = formatters.get(timeZone);

  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  formatters.set(timeZone, formatter);

  return formatter;
}

function partValue(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
): number {
  return Number(parts.find((part) => part.type === type)?.value);
}
