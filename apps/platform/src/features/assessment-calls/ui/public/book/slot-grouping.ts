import { dayKeyOf } from "~/features/assessment-calls/ui/shared/day-key";

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
