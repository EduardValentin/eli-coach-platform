import { motion } from "motion/react";
import { useEffect, useRef, useState, type RefObject } from "react";

import { cn } from "@eli-coach-platform/ui/lib";
import { linkVariants } from "@eli-coach-platform/ui/primitives";

import {
  formatMonthFirstDay,
  formatClockTime,
  nameTimeZone,
} from "~/features/assessment-calls/contracts/call-moment";

import { SlotCalendar } from "./slot-calendar";

type SlotPickerProps = {
  onSelectDay: (dayKey: string | null) => void;
  onSelectSlot: (slot: string) => void;
  selectedDayKey: string | null;
  selectedSlot: string | null;
  slotsByDay: ReadonlyMap<string, readonly string[]>;
  timeZone: string;
};

export function SlotPicker(props: SlotPickerProps) {
  const {
    onSelectDay,
    onSelectSlot,
    selectedDayKey,
    selectedSlot,
    slotsByDay,
    timeZone,
  } = props;
  const [now] = useState(() => new Date());
  const calendarRef = useRef<HTMLDivElement>(null);
  const slotsRef = useRef<HTMLDivElement>(null);
  const daySlots = selectedDayKey ? (slotsByDay.get(selectedDayKey) ?? []) : [];
  const selectedDay = daySlots[0] ? new Date(daySlots[0]) : null;
  const firstSlot = slotsByDay.values().next().value?.[0];
  const zoneReference = selectedDay ?? (firstSlot ? new Date(firstSlot) : now);
  const dayHeading = selectedDay
    ? formatMonthFirstDay(selectedDay, timeZone)
    : null;

  useScrollDaySlotsIntoView(dayHeading, slotsRef);

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:justify-center">
      <div
        className="mx-auto w-full max-w-[340px] shrink-0 scroll-mt-24 lg:mx-0 lg:w-[320px] lg:max-w-none"
        ref={calendarRef}
      >
        <SlotCalendar
          onSelectDay={onSelectDay}
          selectedDayKey={selectedDayKey}
          slotsByDay={slotsByDay}
          timeZone={timeZone}
        />
        <p className="mt-4 text-center text-xs font-medium text-text-secondary">
          {`All times shown in your local timezone (${nameTimeZone(zoneReference, timeZone)})`}
        </p>
      </div>

      {dayHeading ? (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto w-full max-w-[340px] scroll-mt-24 lg:mx-0 lg:w-[240px] lg:max-w-none"
          initial={{ opacity: 0, y: 16 }}
          ref={slotsRef}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <div className="mb-3 flex items-baseline justify-between">
            <div>
              <h3 className="text-base font-semibold text-text-primary">
                {dayHeading}
              </h3>
            </div>
            <button
              className={cn(
                linkVariants({ variant: "brand" }),
                "text-xs lg:hidden",
              )}
              onClick={() =>
                calendarRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                })
              }
              type="button"
            >
              Change date
            </button>
          </div>

          <div className="flex max-h-[300px] flex-col gap-2 overflow-y-auto pr-1">
            {daySlots.map((slot) => (
              <TimeSlotButton
                isSelected={selectedSlot === slot}
                key={slot}
                label={formatClockTime(new Date(slot), timeZone)}
                onSelect={() => onSelectSlot(slot)}
              />
            ))}
          </div>
        </motion.div>
      ) : null}
    </div>
  );
}

function TimeSlotButton(props: {
  isSelected: boolean;
  label: string;
  onSelect: () => void;
}) {
  const { isSelected, label, onSelect } = props;

  return (
    <button
      aria-pressed={isSelected}
      className={cn(
        "w-full rounded-control border px-4 py-3 text-sm font-medium transition-all duration-200",
        {
          "border-brand-primary/30 bg-surface-base text-brand-primary hover:border-brand-primary hover:bg-brand-primary/5":
            !isSelected,
          "border-surface-strong bg-surface-strong text-text-inverted shadow-card":
            isSelected,
        },
      )}
      onClick={onSelect}
      type="button"
    >
      <span>{label}</span>
    </button>
  );
}

function useScrollDaySlotsIntoView(
  dayHeading: string | null,
  slotsRef: RefObject<HTMLDivElement | null>,
) {
  const revealedDay = useRef(dayHeading);

  useEffect(() => {
    if (revealedDay.current === dayHeading) {
      return;
    }

    revealedDay.current = dayHeading;

    if (!dayHeading) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      slotsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [dayHeading, slotsRef]);
}
