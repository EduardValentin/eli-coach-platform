import { motion } from "motion/react";
import { useEffect, useRef, type RefObject } from "react";

import { SlotCalendar } from "./slot-calendar";
import type {
  CalendarDayReader,
  SlotPickerDays,
  SlotPickerWording,
} from "./slot-picker-model";
import { TimeSlotButton } from "./time-slot-button";

type SlotPickerProps = {
  dayKeyOf: CalendarDayReader;
  dayNameOf: CalendarDayReader;
  days: SlotPickerDays;
  onSelectDay: (dayKey: string | null) => void;
  onSelectSlot: (startsAt: string) => void;
  selectedDayKey: string | null;
  selectedSlot: string | null;
  timeZone: string;
  wording: SlotPickerWording;
};

export function SlotPicker(props: SlotPickerProps) {
  const {
    dayKeyOf,
    dayNameOf,
    days,
    onSelectDay,
    onSelectSlot,
    selectedDayKey,
    selectedSlot,
    timeZone,
    wording,
  } = props;
  const calendarRef = useRef<HTMLDivElement>(null);
  const slotsRef = useRef<HTMLDivElement>(null);
  const selectedDay = selectedDayKey ? days.get(selectedDayKey) : undefined;

  useScrollDaySlotsIntoView(selectedDay?.heading ?? null, {
    calendarRef,
    slotsRef,
  });

  return (
    <div
      className="flex flex-col gap-8 lg:flex-row lg:justify-start"
      data-parity="slot-picker"
      data-parity-root="SlotPicker"
    >
      <div
        className="mx-auto w-full max-w-[340px] shrink-0 scroll-mt-24 lg:mx-0 lg:w-[320px] lg:max-w-none"
        ref={calendarRef}
      >
        <SlotCalendar
          dayKeyOf={dayKeyOf}
          dayNameOf={dayNameOf}
          days={days}
          onSelectDay={onSelectDay}
          selectedDayKey={selectedDayKey}
          timeZone={timeZone}
          wording={wording}
        />
      </div>

      {selectedDay ? (
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
                {selectedDay.heading}
              </h3>
            </div>
            <button
              className="text-xs font-semibold text-primary underline-offset-4 transition-colors duration-150 ease-out hover:text-primary-hover hover:underline lg:hidden"
              onClick={() =>
                calendarRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                })
              }
              type="button"
            >
              {wording.changeDate}
            </button>
          </div>

          <div
            className="flex max-h-[300px] flex-col gap-2 overflow-y-auto pr-1"
            data-parity="slot-picker-times"
          >
            {selectedDay.slots.map((slot) => (
              <TimeSlotButton
                isSelected={selectedSlot === slot.startsAt}
                key={slot.startsAt}
                label={slot.label}
                onSelect={() => onSelectSlot(slot.startsAt)}
              />
            ))}
          </div>
        </motion.div>
      ) : null}
    </div>
  );
}

type DaySlotsLayout = {
  calendarRef: RefObject<HTMLDivElement | null>;
  slotsRef: RefObject<HTMLDivElement | null>;
};

function rendersBelow(element: HTMLElement, reference: HTMLElement): boolean {
  return (
    element.getBoundingClientRect().top >=
    reference.getBoundingClientRect().bottom
  );
}

function useScrollDaySlotsIntoView(
  dayHeading: string | null,
  { calendarRef, slotsRef }: DaySlotsLayout,
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
      const calendar = calendarRef.current;
      const slots = slotsRef.current;

      if (!calendar || !slots || !rendersBelow(slots, calendar)) {
        return;
      }

      slots.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [calendarRef, dayHeading, slotsRef]);
}
