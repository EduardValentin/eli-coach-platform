import { Calendar, type CalendarProps } from "@eli-coach-platform/ui/calendar";
import { memo, useCallback, useMemo, useState } from "react";

import {
  describeTimeZone,
  formatCallDay,
} from "~/features/assessment-calls/contracts/call-moment";

import { dayKeyOf, horizonEnd } from "./slot-grouping";

type SlotCalendarProps = {
  onSelectDay: (dayKey: string | null) => void;
  selectedDayKey: string | null;
  slotsByDay: ReadonlyMap<string, readonly string[]>;
  timeZone: string;
};

const PAST_DAY_REASON = "Past day";
const NO_OPEN_SLOTS_REASON = "No open slots";

export const SlotCalendar = memo(function SlotCalendar(
  props: SlotCalendarProps,
) {
  const { onSelectDay, selectedDayKey, slotsByDay, timeZone } = props;
  const [now] = useState(() => new Date());
  const todayKey = dayKeyOf(now, timeZone);
  const firstOpenSlot = useMemo(
    () => slotsByDay.values().next().value?.[0],
    [slotsByDay],
  );
  const selectedDaySlot = selectedDayKey
    ? slotsByDay.get(selectedDayKey)?.[0]
    : undefined;

  const hasOpenSlots = useCallback(
    (date: Date) => slotsByDay.has(dayKeyOf(date, timeZone)),
    [slotsByDay, timeZone],
  );
  const isPastDay = useCallback(
    (date: Date) => dayKeyOf(date, timeZone) < todayKey,
    [timeZone, todayKey],
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
      labelDayButton: (date, dayModifiers) => {
        const day = formatCallDay(date, timeZone);

        if (dayModifiers.pastDay) {
          return `${day}, ${PAST_DAY_REASON}`;
        }

        if (dayModifiers.noOpenSlots) {
          return `${day}, ${NO_OPEN_SLOTS_REASON}`;
        }

        return day;
      },
    }),
    [timeZone],
  );
  const selectDay = useCallback(
    (date: Date | undefined) =>
      onSelectDay(date ? dayKeyOf(date, timeZone) : null),
    [onSelectDay, timeZone],
  );
  const selected = useMemo(
    () => (selectedDaySlot ? new Date(selectedDaySlot) : undefined),
    [selectedDaySlot],
  );
  const zoneReferenceInstant = useMemo(
    () => (firstOpenSlot ? new Date(firstOpenSlot) : now),
    [firstOpenSlot, now],
  );
  const endMonth = useMemo(() => horizonEnd(now, timeZone), [now, timeZone]);

  return (
    <div className="w-full max-w-sm shrink-0">
      <Calendar
        aria-label="Available days"
        defaultMonth={zoneReferenceInstant}
        disabled={hasNoOpenSlots}
        endMonth={endMonth}
        labels={dayLabels}
        modifiers={modifiers}
        onSelect={selectDay}
        selected={selected}
        startMonth={now}
        timeZone={timeZone}
      />
      <p className="mt-4 text-body-sm leading-copy-relaxed text-copy-muted">
        Times are shown in {describeTimeZone(zoneReferenceInstant, timeZone)}.
      </p>
    </div>
  );
});
