type CallMomentWording =
  | "dayFirstDate"
  | "monthFirstDate"
  | "monthFirstDay"
  | "clockTime"
  | "zoneOffset";

const WORDINGS: Record<
  CallMomentWording,
  { locale: string; options: Intl.DateTimeFormatOptions }
> = {
  dayFirstDate: {
    locale: "en-GB",
    options: {
      day: "numeric",
      month: "long",
      weekday: "long",
      year: "numeric",
    },
  },
  monthFirstDate: {
    locale: "en-US",
    options: {
      day: "numeric",
      month: "long",
      weekday: "long",
      year: "numeric",
    },
  },
  monthFirstDay: {
    locale: "en-US",
    options: { day: "numeric", month: "long", weekday: "long" },
  },
  clockTime: {
    locale: "en-US",
    options: { hour: "numeric", hour12: true, minute: "2-digit" },
  },
  zoneOffset: { locale: "en-GB", options: { timeZoneName: "shortOffset" } },
};

const formatters = new Map<string, Intl.DateTimeFormat>();

export function formatCallMoment(instant: Date, timeZone: string): string {
  return `${formatDayFirstDate(instant, timeZone)} at ${formatClockTime(instant, timeZone)} — ${describeTimeZone(instant, timeZone)}`;
}

export function formatDayFirstDate(instant: Date, timeZone: string): string {
  return formatterFor("dayFirstDate", timeZone).format(instant);
}

export function formatMonthFirstDate(instant: Date, timeZone: string): string {
  return formatterFor("monthFirstDate", timeZone).format(instant);
}

export function formatMonthFirstDay(instant: Date, timeZone: string): string {
  return formatterFor("monthFirstDay", timeZone).format(instant);
}

export function formatClockTime(instant: Date, timeZone: string): string {
  return formatterFor("clockTime", timeZone).format(instant);
}

export function nameTimeZone(instant: Date, timeZone: string): string {
  const offset = zoneOffset(instant, timeZone);

  return offset ? `${timeZone}, ${offset}` : timeZone;
}

function describeTimeZone(instant: Date, timeZone: string): string {
  const offset = zoneOffset(instant, timeZone);

  return offset ? `${timeZone} (${offset})` : timeZone;
}

function zoneOffset(instant: Date, timeZone: string): string {
  return (
    formatterFor("zoneOffset", timeZone)
      .formatToParts(instant)
      .find((part) => part.type === "timeZoneName")?.value ?? ""
  );
}

function formatterFor(
  wording: CallMomentWording,
  timeZone: string,
): Intl.DateTimeFormat {
  const key = `${wording}:${timeZone}`;
  const cached = formatters.get(key);

  if (cached) {
    return cached;
  }

  const { locale, options } = WORDINGS[wording];
  const formatter = new Intl.DateTimeFormat(locale, { ...options, timeZone });
  formatters.set(key, formatter);

  return formatter;
}
