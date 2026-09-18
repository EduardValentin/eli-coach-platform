import { TZDate } from "@date-fns/tz";

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
