import { TZDate } from "@date-fns/tz";
import { ASSESSMENT_CALL_RULES } from "@eli-coach-platform/domain/coach-availability";

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export function dayKeyOf(instant: Date, timeZone: string): string {
  const zoned = new TZDate(instant, timeZone);
  const month = String(zoned.getMonth() + 1).padStart(2, "0");
  const day = String(zoned.getDate()).padStart(2, "0");

  return `${zoned.getFullYear()}-${month}-${day}`;
}

export function groupSlotsByDay(
  slots: readonly string[],
  timeZone: string,
): Map<string, string[]> {
  const grouped = new Map<string, string[]>();

  for (const slot of slots) {
    const key = dayKeyOf(new Date(slot), timeZone);
    const sameDay = grouped.get(key);

    if (sameDay) {
      sameDay.push(slot);
    } else {
      grouped.set(key, [slot]);
    }
  }

  return grouped;
}

export function horizonEnd(now: Date, timeZone: string): Date {
  return new TZDate(
    now.getTime() + ASSESSMENT_CALL_RULES.horizonDays * MILLISECONDS_PER_DAY,
    timeZone,
  );
}

export function formatSlotLabel(instant: Date, timeZone: string): string {
  const part = partReader(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: true,
      minute: "2-digit",
      timeZone,
    }).formatToParts(instant),
  );

  return `${part("hour")}:${part("minute")} ${part("dayPeriod")}`;
}

export function formatSlotDay(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    timeZone,
    weekday: "long",
  }).format(instant);
}

export function formatCalendarDay(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    timeZone,
    weekday: "long",
    year: "numeric",
  }).format(instant);
}

export function formatCallMoment(instant: Date, timeZone: string): string {
  return `${formatCalendarDay(instant, timeZone)} at ${formatSlotLabel(instant, timeZone)} — ${describeTimeZone(timeZone, instant)}`;
}

export function describeTimeZone(timeZone: string, reference: Date): string {
  const offset = partReader(
    new Intl.DateTimeFormat("en-GB", {
      timeZone,
      timeZoneName: "shortOffset",
    }).formatToParts(reference),
  )("timeZoneName");

  return offset ? `${timeZone} (${offset})` : timeZone;
}

function partReader(
  parts: readonly Intl.DateTimeFormatPart[],
): (type: Intl.DateTimeFormatPartTypes) => string {
  return (type) => parts.find((part) => part.type === type)?.value ?? "";
}
