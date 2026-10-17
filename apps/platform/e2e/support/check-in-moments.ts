import { escapedPattern } from "./locator-text";

const ANY_SPACE = /\s+/g;

export function dayNameOf(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    timeZone,
    weekday: "long",
    year: "numeric",
  }).formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value ?? "";

  return `${part("weekday")}, ${part("day")} ${part("month")} ${part("year")}`;
}

export function clockTimeOf(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    hour12: true,
    minute: "2-digit",
    timeZone,
  }).format(instant);
}

export function shortDayOf(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone,
    weekday: "short",
  }).format(instant);
}

export function shortMomentOf(instant: Date, timeZone: string): string {
  return `${shortDayOf(instant, timeZone)} · ${clockTimeOf(instant, timeZone)}`;
}

export function emailMomentOf(instant: Date, timeZone: string): string {
  return `${dayNameOf(instant, timeZone)} at ${clockTimeOf(instant, timeZone)}`;
}

export function shownTimePatternOf(instant: Date, timeZone: string): RegExp {
  return new RegExp(spacedPattern(clockTimeOf(instant, timeZone)));
}

export function spacedPattern(text: string): string {
  return text.split(ANY_SPACE).map(escapedPattern).join("\\s");
}

export type WeeklyHour = { day: string; hour: number; timeZone: string };

export type WeekBounds = { from: Date; until: Date };

const HOUR_MS = 60 * 60 * 1000;

export function weeklyStartsBetween(
  weekly: WeeklyHour,
  { from, until }: WeekBounds,
): Date[] {
  const starts: Date[] = [];

  for (
    let instant = Math.ceil(from.getTime() / HOUR_MS) * HOUR_MS;
    instant < until.getTime();
    instant += HOUR_MS
  ) {
    const candidate = new Date(instant);

    if (isWeeklyHour(candidate, weekly)) {
      starts.push(candidate);
    }
  }

  return starts;
}

export function weeklyMomentOf(instant: Date, timeZone: string): string {
  const weekday = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "long",
  }).format(instant);

  return `Every ${weekday} at ${clockTimeOf(instant, timeZone)}`;
}

function isWeeklyHour(instant: Date, weekly: WeeklyHour): boolean {
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    hourCycle: "h23",
    timeZone: weekly.timeZone,
    weekday: "long",
  }).formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value;

  return part("weekday") === weekly.day && Number(part("hour")) === weekly.hour;
}
