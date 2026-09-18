export function formatCallMoment(startsAt: Date, timeZone: string): string {
  return `${formatDay(startsAt, timeZone)} at ${formatTime(startsAt, timeZone)} — ${describeTimeZone(startsAt, timeZone)}`;
}

function formatDay(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    timeZone,
    weekday: "long",
    year: "numeric",
  }).format(instant);
}

function formatTime(instant: Date, timeZone: string): string {
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

function describeTimeZone(instant: Date, timeZone: string): string {
  const part = partReader(
    new Intl.DateTimeFormat("en-GB", {
      timeZone,
      timeZoneName: "shortOffset",
    }).formatToParts(instant),
  );
  const offset = part("timeZoneName");

  return offset ? `${timeZone} (${offset})` : timeZone;
}

function partReader(
  parts: readonly Intl.DateTimeFormatPart[],
): (type: Intl.DateTimeFormatPartTypes) => string {
  return (type) => parts.find((part) => part.type === type)?.value ?? "";
}
