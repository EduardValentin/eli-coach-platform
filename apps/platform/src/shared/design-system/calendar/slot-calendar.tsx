import { memo, useCallback, useMemo, useState } from "react";

import { Calendar, type CalendarProps } from "./calendar";
import type {
  CalendarDayReader,
  SlotPickerDays,
  SlotPickerWording,
} from "./slot-picker-model";

type SlotCalendarProps = {
  dayKeyOf: CalendarDayReader;
  dayNameOf: CalendarDayReader;
  days: SlotPickerDays;
  onSelectDay: (dayKey: string | null) => void;
  selectedDayKey: string | null;
  timeZone: string;
  wording: SlotPickerWording;
};

export const SlotCalendar = memo(function SlotCalendar(
  props: SlotCalendarProps,
) {
  const {
    dayKeyOf,
    dayNameOf,
    days,
    onSelectDay,
    selectedDayKey,
    timeZone,
    wording,
  } = props;
  const [now] = useState(() => new Date());
  const todayKey = dayKeyOf(now);
  const firstOpenSlot = useMemo(
    () => days.values().next().value?.slots[0]?.startsAt,
    [days],
  );
  const selectedDaySlot = selectedDayKey
    ? days.get(selectedDayKey)?.slots[0]?.startsAt
    : undefined;

  const hasOpenSlots = useCallback(
    (date: Date) => days.has(dayKeyOf(date)),
    [dayKeyOf, days],
  );
  const isPastDay = useCallback(
    (date: Date) => dayKeyOf(date) < todayKey,
    [dayKeyOf, todayKey],
  );
  const hasNoOpenSlots = useCallback(
    (date: Date) => !hasOpenSlots(date),
    [hasOpenSlots],
  );
  const modifiers = useMemo(
    () => ({
      noOpenSlots: (date: Date) => !isPastDay(date) && !hasOpenSlots(date),
      pastDay: isPastDay,
    }),
    [hasOpenSlots, isPastDay],
  );
  const dayLabels = useMemo<CalendarProps["labels"]>(
    () => ({
      labelDayButton: (date, dayModifiers) =>
        [
          dayModifiers.today && wording.today,
          dayNameOf(date),
          dayModifiers.pastDay && wording.pastDay,
          dayModifiers.noOpenSlots && wording.noOpenSlots,
          dayModifiers.selected && wording.selected,
        ]
          .filter(Boolean)
          .join(", "),
    }),
    [dayNameOf, wording],
  );
  const selectDay = useCallback(
    (date: Date | undefined) => onSelectDay(date ? dayKeyOf(date) : null),
    [dayKeyOf, onSelectDay],
  );
  const selected = useMemo(
    () => (selectedDaySlot ? new Date(selectedDaySlot) : undefined),
    [selectedDaySlot],
  );
  const firstOpenInstant = useMemo(
    () => (firstOpenSlot ? new Date(firstOpenSlot) : now),
    [firstOpenSlot, now],
  );

  return (
    <Calendar
      aria-label={wording.availableDays}
      defaultMonth={selected ?? firstOpenInstant}
      disabled={hasNoOpenSlots}
      labels={dayLabels}
      modifiers={modifiers}
      onSelect={selectDay}
      selected={selected}
      timeZone={timeZone}
    />
  );
});
