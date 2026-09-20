import { useEffect, useMemo, useState } from 'react';
import { TZDate } from '@date-fns/tz';
import type { DayButtonProps, Labels } from 'react-day-picker';
import { BrandCalendar, BrandDayButton } from './BrandCalendar';
import { SlotPickerFrame, TimeSlotButton } from './DateTimePicker';
import {
  formatSlotTime,
  formatDayFirstDate,
  formatZonedDate,
  nameTimeZone,
} from '../utils/dateFormatters';

type AssessmentSlotPickerProps = {
  slots: Date[];
  timeZone: string;
  selectedSlot: Date | null;
  onSelectSlot: (slot: Date | null) => void;
};

const TODAY_PREFIX = 'Today';
const PAST_DAY_REASON = 'Past day';
const NO_SLOTS_REASON = 'No open slots';
const SELECTED_STATE = 'selected';

function dayKeyOf(instant: Date, timeZone: string): string {
  const zoned = new TZDate(instant, timeZone);
  const month = String(zoned.getMonth() + 1).padStart(2, '0');
  const day = String(zoned.getDate()).padStart(2, '0');
  return `${zoned.getFullYear()}-${month}-${day}`;
}

function SlotDayButton(props: DayButtonProps) {
  const { modifiers } = props;

  return (
    <BrandDayButton
      {...props}
      aria-disabled={modifiers.disabled || undefined}
    />
  );
}

export function AssessmentSlotPicker({
  slots,
  timeZone,
  selectedSlot,
  onSelectSlot,
}: AssessmentSlotPickerProps) {
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  const slotsByDay = useMemo(() => {
    const grouped = new Map<string, Date[]>();
    for (const slot of slots) {
      const key = dayKeyOf(slot, timeZone);
      const existing = grouped.get(key);
      if (existing) existing.push(slot);
      else grouped.set(key, [slot]);
    }
    return grouped;
  }, [slots, timeZone]);

  useEffect(() => {
    if (!selectedSlot) return;
    setSelectedDayKey(dayKeyOf(selectedSlot, timeZone));
  }, [selectedSlot, timeZone]);

  const today = useMemo(() => new Date(), []);
  const dayLabels = useMemo<Partial<Labels>>(
    () => ({
      labelDayButton: (date, modifiers) =>
        [
          modifiers.today && TODAY_PREFIX,
          formatDayFirstDate(date, timeZone),
          modifiers.pastDay && PAST_DAY_REASON,
          modifiers.noSlots && NO_SLOTS_REASON,
          modifiers.selected && SELECTED_STATE,
        ]
          .filter(Boolean)
          .join(', '),
    }),
    [timeZone],
  );
  const daySlots = selectedDayKey ? (slotsByDay.get(selectedDayKey) ?? []) : [];
  const selectedDay = daySlots[0] ?? null;
  const zoneName = nameTimeZone(timeZone, selectedDay ?? slots[0] ?? today);

  const hasOpenSlots = (date: Date) => slotsByDay.has(dayKeyOf(date, timeZone));
  const isPastDay = (date: Date) =>
    dayKeyOf(date, timeZone) < dayKeyOf(today, timeZone);

  const selectDay = (date: Date | undefined) => {
    setSelectedDayKey(date ? dayKeyOf(date, timeZone) : null);
    onSelectSlot(null);
  };

  return (
    <SlotPickerFrame
      calendar={
        <BrandCalendar
          mode="single"
          fixedWeeks
          timeZone={timeZone}
          labels={dayLabels}
          defaultMonth={selectedSlot ?? slots[0] ?? today}
          selected={selectedDay ?? undefined}
          onSelect={selectDay}
          disabled={(date) => !hasOpenSlots(date)}
          modifiers={{
            pastDay: isPastDay,
            noSlots: (date) => !isPastDay(date) && !hasOpenSlots(date),
          }}
          components={{ DayButton: SlotDayButton }}
        />
      }
      timeZoneNote={`All times shown in your local timezone (${zoneName})`}
      dayHeading={selectedDay ? formatZonedDate(selectedDay, timeZone, 'EEEE, MMMM d') : null}
      DayHeading="h3"
      revealScrollMargin="scroll-mt-24"
    >
      {daySlots.map((slot) => (
        <TimeSlotButton
          key={slot.toISOString()}
          label={formatSlotTime(slot, timeZone)}
          isSelected={selectedSlot?.getTime() === slot.getTime()}
          onSelect={() => onSelectSlot(slot)}
        />
      ))}
    </SlotPickerFrame>
  );
}
