export const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

export type Weekday = (typeof WEEKDAYS)[number];

export function weekdayNamed(name: string): Weekday | null {
  const candidate = name.trim().toLowerCase();

  return WEEKDAYS.find((weekday) => weekday === candidate) ?? null;
}
