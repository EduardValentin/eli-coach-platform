type CallMomentFormat =
  "day" | "time" | "zone" | "date" | "dayHeading" | "slotTime";

const FORMATS: Record<
  CallMomentFormat,
  { locale: string | undefined; options: Intl.DateTimeFormatOptions }
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
  time: {
    locale: "en-US",
    options: { hour: "numeric", hour12: true, minute: "2-digit" },
  },
  zone: { locale: "en-GB", options: { timeZoneName: "shortOffset" } },
  date: {
    locale: "en-US",
    options: {
      day: "numeric",
      month: "long",
      weekday: "long",
      year: "numeric",
    },
  },
  dayHeading: {
    locale: "en-US",
    options: { day: "numeric", month: "long", weekday: "long" },
  },
  slotTime: {
    locale: undefined,
    options: { hour: "numeric", hour12: true, minute: "2-digit" },
  },
};

const formatters = new Map<string, Intl.DateTimeFormat>();

export function formatCallMoment(instant: Date, timeZone: string): string {
  return `${formatCallDay(instant, timeZone)} at ${formatCallTime(instant, timeZone)} — ${describeTimeZone(instant, timeZone)}`;
}

export function formatCallDay(instant: Date, timeZone: string): string {
  return formatterFor("day", timeZone).format(instant);
}

export function formatCallDate(instant: Date, timeZone: string): string {
  return formatterFor("date", timeZone).format(instant);
}

export function formatCallDayHeading(instant: Date, timeZone: string): string {
  return formatterFor("dayHeading", timeZone).format(instant);
}

export function formatSlotTime(instant: Date, timeZone: string): string {
  return formatterFor("slotTime", timeZone).format(instant);
}

export function nameTimeZone(instant: Date, timeZone: string): string {
  const offset = zoneOffset(instant, timeZone);

  return offset ? `${timeZone}, ${offset}` : timeZone;
}

function formatCallTime(instant: Date, timeZone: string): string {
  const part = partReader(
    formatterFor("time", timeZone).formatToParts(instant),
  );

  return `${part("hour")}:${part("minute")} ${part("dayPeriod")}`;
}

function describeTimeZone(instant: Date, timeZone: string): string {
  const offset = zoneOffset(instant, timeZone);

  return offset ? `${timeZone} (${offset})` : timeZone;
}

function zoneOffset(instant: Date, timeZone: string): string {
  return partReader(formatterFor("zone", timeZone).formatToParts(instant))(
    "timeZoneName",
  );
}

function formatterFor(
  format: CallMomentFormat,
  timeZone: string,
): Intl.DateTimeFormat {
  const key = `${format}:${timeZone}`;
  const cached = formatters.get(key);

  if (cached) {
    return cached;
  }

  const { locale, options } = FORMATS[format];
  const formatter = new Intl.DateTimeFormat(locale, { ...options, timeZone });
  formatters.set(key, formatter);

  return formatter;
}

function partReader(
  parts: readonly Intl.DateTimeFormatPart[],
): (type: Intl.DateTimeFormatPartTypes) => string {
  return (type) => parts.find((part) => part.type === type)?.value ?? "";
}
