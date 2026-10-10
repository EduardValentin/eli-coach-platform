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

export function emailMomentOf(instant: Date, timeZone: string): string {
  return `${dayNameOf(instant, timeZone)} at ${clockTimeOf(instant, timeZone)}`;
}

export function spacedPattern(text: string): string {
  return text.split(ANY_SPACE).map(escapedPattern).join("\\s");
}
