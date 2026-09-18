const callDateFormatters = new Map<string, Intl.DateTimeFormat>();

export function formatCallDate(instant: Date, timeZone: string): string {
  return formatterFor(
    "date",
    { day: "numeric", month: "long", weekday: "long", year: "numeric" },
    timeZone,
  ).format(instant);
}

export function formatCallDayHeading(instant: Date, timeZone: string): string {
  return formatterFor(
    "day-heading",
    { day: "numeric", month: "long", weekday: "long" },
    timeZone,
  ).format(instant);
}

export function formatSlotTime(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    hour12: true,
    minute: "2-digit",
    timeZone,
  }).format(instant);
}

export function nameTimeZone(timeZone: string, reference: Date): string {
  const offset = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    timeZoneName: "shortOffset",
  })
    .formatToParts(reference)
    .find((part) => part.type === "timeZoneName")?.value;

  return offset ? `${timeZone}, ${offset}` : timeZone;
}

function formatterFor(
  name: string,
  options: Intl.DateTimeFormatOptions,
  timeZone: string,
): Intl.DateTimeFormat {
  const key = `${name}:${timeZone}`;
  const cached = callDateFormatters.get(key);

  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat("en-US", { ...options, timeZone });
  callDateFormatters.set(key, formatter);

  return formatter;
}
