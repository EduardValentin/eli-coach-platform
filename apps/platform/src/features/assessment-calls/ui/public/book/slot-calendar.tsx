import { Calendar, type CalendarProps } from "@eli-coach-platform/ui/calendar";
import { useState } from "react";

import {
  dayKeyOf,
  describeTimeZone,
  formatCalendarDay,
  horizonEnd,
} from "./slot-grouping";

type SlotCalendarProps = {
  onSelectDay: (dayKey: string | null) => void;
  selectedDayKey: string | null;
  slotsByDay: ReadonlyMap<string, readonly string[]>;
  timeZone: string;
};

const PAST_DAY_REASON = "Past day";
const NO_OPEN_SLOTS_REASON = "No open slots";

export function SlotCalendar(props: SlotCalendarProps) {
  const { onSelectDay, selectedDayKey, slotsByDay, timeZone } = props;
  const [now] = useState(() => new Date());
  const todayKey = dayKeyOf(now, timeZone);
  const firstOpenSlot = [...slotsByDay.values()][0]?.[0];
  const selectedDaySlot = selectedDayKey
    ? slotsByDay.get(selectedDayKey)?.[0]
    : undefined;

  const hasOpenSlots = (date: Date) => slotsByDay.has(dayKeyOf(date, timeZone));
  const isPastDay = (date: Date) => dayKeyOf(date, timeZone) < todayKey;

  const dayLabels: CalendarProps["labels"] = {
    labelDayButton: (date, modifiers) => {
      const day = formatCalendarDay(date, timeZone);

      if (modifiers.pastDay) {
        return `${day}, ${PAST_DAY_REASON}`;
      }

      if (modifiers.noOpenSlots) {
        return `${day}, ${NO_OPEN_SLOTS_REASON}`;
      }

      return day;
    },
  };

  return (
    <div className="w-full max-w-sm shrink-0">
      <Calendar
        aria-label="Available days"
        defaultMonth={firstOpenSlot ? new Date(firstOpenSlot) : now}
        disabled={(date) => !hasOpenSlots(date)}
        endMonth={horizonEnd(now, timeZone)}
        labels={dayLabels}
        modifiers={{
          noOpenSlots: (date) => !isPastDay(date) && !hasOpenSlots(date),
          pastDay: isPastDay,
        }}
        onSelect={(date) => onSelectDay(date ? dayKeyOf(date, timeZone) : null)}
        selected={selectedDaySlot ? new Date(selectedDaySlot) : undefined}
        startMonth={now}
        timeZone={timeZone}
      />
      <p className="mt-4 text-body-sm leading-copy-relaxed text-copy-muted">
        Times are shown in {describeTimeZone(timeZone, now)}.
      </p>
    </div>
  );
}
