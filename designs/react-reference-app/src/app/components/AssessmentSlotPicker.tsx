import { useEffect, useMemo, useState } from 'react';
import { TZDate } from '@date-fns/tz';
import type { DayButtonProps } from 'react-day-picker';
import { BrandCalendar } from './BrandCalendar';
import {
  describeTimeZone,
  formatSlotDay,
  formatSlotTime,
} from '../utils/dateFormatters';

type AssessmentSlotPickerProps = {
  slots: Date[];
  timeZone: string;
  selectedSlot: Date | null;
  onSelectSlot: (slot: Date) => void;
  horizonEnd: Date;
};

const PAST_DAY_REASON = 'Past day';
const NO_SLOTS_REASON = 'No open slots';

function dayKeyOf(instant: Date, timeZone: string): string {
  const zoned = new TZDate(instant, timeZone);
  const month = String(zoned.getMonth() + 1).padStart(2, '0');
  const day = String(zoned.getDate()).padStart(2, '0');
  return `${zoned.getFullYear()}-${month}-${day}`;
}

function SlotDayButton({ day, modifiers, ...buttonProps }: DayButtonProps) {
  const reason = modifiers.pastDay
    ? PAST_DAY_REASON
    : modifiers.noSlots
      ? NO_SLOTS_REASON
      : null;
  const label = buttonProps['aria-label'];

  return (
    <button
      {...buttonProps}
      aria-disabled={modifiers.disabled || undefined}
      aria-label={reason && label ? `${label}, ${reason}` : label}
    />
  );
}

export function AssessmentSlotPicker({
  slots,
  timeZone,
  selectedSlot,
  onSelectSlot,
  horizonEnd,
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
  const zoneLine = describeTimeZone(timeZone, slots[0] ?? today);
  const daySlots = selectedDayKey ? (slotsByDay.get(selectedDayKey) ?? []) : [];
  const selectedDay = daySlots[0] ?? null;

  const hasOpenSlots = (date: Date) => slotsByDay.has(dayKeyOf(date, timeZone));
  const isPastDay = (date: Date) =>
    dayKeyOf(date, timeZone) < dayKeyOf(today, timeZone);

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
      <div className="w-full max-w-[22rem] shrink-0">
        <BrandCalendar
          mode="single"
          timeZone={timeZone}
          startMonth={today}
          endMonth={horizonEnd}
          defaultMonth={slots[0] ?? today}
          selected={selectedDay ?? undefined}
          onSelect={(date) =>
            setSelectedDayKey(date ? dayKeyOf(date, timeZone) : null)
          }
          disabled={(date) => !hasOpenSlots(date)}
          modifiers={{
            pastDay: isPastDay,
            noSlots: (date) => !isPastDay(date) && !hasOpenSlots(date),
          }}
          components={{ DayButton: SlotDayButton }}
        />
        <p className="mt-4 text-sm text-copy-muted">
          Times are shown in {zoneLine}.
        </p>
      </div>

      {daySlots.length > 0 && (
        <fieldset className="w-full min-w-0 border-0 p-0">
          <legend className="mb-3 text-sm font-semibold text-foreground">
            Pick a time on {formatSlotDay(daySlots[0], timeZone)}
          </legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {daySlots.map((slot) => {
              const label = formatSlotTime(slot, timeZone);
              return (
                <label key={slot.toISOString()} className="block">
                  <input
                    type="radio"
                    name="assessment-slot"
                    value={slot.toISOString()}
                    checked={selectedSlot?.getTime() === slot.getTime()}
                    onChange={() => onSelectSlot(slot)}
                    className="peer sr-only"
                  />
                  <span className="block cursor-pointer rounded-xl border border-brand/30 bg-card px-4 py-3 text-center text-sm font-medium text-brand transition-colors hover:border-brand hover:bg-brand-soft peer-checked:border-brand peer-checked:bg-brand peer-checked:text-brand-foreground peer-checked:hover:border-brand-hover peer-checked:hover:bg-brand-hover peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand">
                    {label}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}
    </div>
  );
}
