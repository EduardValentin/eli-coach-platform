import type {
  SlotPickerDays,
  SlotPickerWording,
} from "@eli-coach-platform/ui/calendar";
import { useCallback, useMemo } from "react";

import {
  formatClockTime,
  formatDayFirstDate,
  formatMonthFirstDay,
} from "~/features/assessment-calls/public/call-moment";
import { dayKeyOf } from "~/features/assessment-calls/ui/shared/day-key";

const SLOT_PICKER_WORDING: SlotPickerWording = {
  availableDays: "Available days",
  changeDate: "Change date",
  noOpenSlots: "No open slots",
  pastDay: "Past day",
  selected: "selected",
  today: "Today",
};

export function useSlotPickerDays(slots: readonly string[], timeZone: string) {
  const days = useMemo(
    () => slotPickerDaysOf(slots, timeZone),
    [slots, timeZone],
  );
  const dayKeyInZone = useCallback(
    (date: Date) => dayKeyOf(date, timeZone),
    [timeZone],
  );
  const dayNameInZone = useCallback(
    (date: Date) => formatDayFirstDate(date, timeZone),
    [timeZone],
  );

  return {
    dayKeyOf: dayKeyInZone,
    dayNameOf: dayNameInZone,
    days,
    timeZone,
    wording: SLOT_PICKER_WORDING,
  };
}

function slotPickerDaysOf(
  slots: readonly string[],
  timeZone: string,
): SlotPickerDays {
  return new Map(
    [...groupSlotsByDay(slots, timeZone)].map(([dayKey, daySlots]) => [
      dayKey,
      {
        heading: formatMonthFirstDay(new Date(daySlots[0]), timeZone),
        slots: daySlots.map((startsAt) => ({
          label: formatClockTime(new Date(startsAt), timeZone),
          startsAt,
        })),
      },
    ]),
  );
}

function groupSlotsByDay(
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
