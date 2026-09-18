type CallMomentPart = "day" | "weekday" | "time" | "zone";

const PART_FORMATS: Record<
  CallMomentPart,
  { locale: string; options: Intl.DateTimeFormatOptions }
> = {
  day: {
    locale: "en-GB",
    options: {
      day: "numeric",
      month: "long",
      weekday: "long",
      year: "numeric",
    },
  },
  weekday: {
    locale: "en-GB",
    options: { day: "numeric", month: "long", weekday: "long" },
  },
  time: {
    locale: "en-US",
    options: { hour: "numeric", hour12: true, minute: "2-digit" },
  },
  zone: { locale: "en-GB", options: { timeZoneName: "shortOffset" } },
};

const formatters = new Map<string, Intl.DateTimeFormat>();

export function formatCallMoment(instant: Date, timeZone: string): string {
  return `${formatCallDay(instant, timeZone)} at ${formatCallTime(instant, timeZone)} — ${describeTimeZone(instant, timeZone)}`;
}

export function formatCallDay(instant: Date, timeZone: string): string {
  return formatterFor("day", timeZone).format(instant);
}

export function formatCallWeekday(instant: Date, timeZone: string): string {
  return formatterFor("weekday", timeZone).format(instant);
}

export function formatCallTime(instant: Date, timeZone: string): string {
  const part = partReader(
    formatterFor("time", timeZone).formatToParts(instant),
  );

  return `${part("hour")}:${part("minute")} ${part("dayPeriod")}`;
}

export function describeTimeZone(instant: Date, timeZone: string): string {
  const offset = partReader(
    formatterFor("zone", timeZone).formatToParts(instant),
  )("timeZoneName");

  return offset ? `${timeZone} (${offset})` : timeZone;
}

function formatterFor(
  part: CallMomentPart,
  timeZone: string,
): Intl.DateTimeFormat {
  const key = `${part}:${timeZone}`;
  const cached = formatters.get(key);

  if (cached) {
    return cached;
  }

  const { locale, options } = PART_FORMATS[part];
  const formatter = new Intl.DateTimeFormat(locale, { ...options, timeZone });
  formatters.set(key, formatter);

  return formatter;
}

function partReader(
  parts: readonly Intl.DateTimeFormatPart[],
): (type: Intl.DateTimeFormatPartTypes) => string {
  return (type) => parts.find((part) => part.type === type)?.value ?? "";
}
