import { Calendar } from "@eli-coach-platform/ui/calendar";
import { cn } from "@eli-coach-platform/ui/lib";
import {
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@eli-coach-platform/ui/primitives";
import { Calendar as CalendarIcon } from "lucide-react";
import { useState } from "react";

import {
  MAX_BOOKING_AGE,
  MIN_BOOKING_AGE,
} from "~/features/assessment-calls/contracts/visitor-profile";
import { dayKeyOf } from "~/features/assessment-calls/ui/shared/day-key";

import { FieldError } from "./field-error";

const DEFAULT_YEARS_BACK = 30;
const PLACEHOLDER = "Select a date";
const NOON_UTC = 12;

// The trigger is a button that has to read as one of the form's fields, so it
// carries the Input primitive's frame rather than a button variant.
const FIELD_BUTTON_CLASS =
  "flex h-12 w-full min-w-0 items-center justify-between gap-2 rounded-field border border-control-border-soft bg-surface-quiet/50 px-3 py-1 text-left text-base transition-[color,box-shadow] outline-none focus-visible:border-border-focus data-[invalid]:border-feedback-danger md:text-sm";

const birthDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
  year: "numeric",
});

type DateOfBirthFieldProps = {
  error: string | undefined;
  id: string;
  label: string;
  now: Date;
  onChange: (isoDate: string) => void;
  timeZone: string;
  value: string;
};

export function DateOfBirthField(props: DateOfBirthFieldProps) {
  const { error, id, label, now, onChange, timeZone, value } = props;
  const [open, setOpen] = useState(false);
  const today = calendarDateOf(dayKeyOf(now, timeZone));
  const latestAllowed = yearsBefore(today, MIN_BOOKING_AGE);
  const selected = value ? atNoonUtc(calendarDateOf(value)) : undefined;
  const errorId = `${id}-error`;

  const choose = (date: Date | undefined) => {
    onChange(date ? dayKeyOf(date, timeZone) : "");
    setOpen(false);
  };

  return (
    <div className="space-y-2" data-parity-root="DateOfBirthField">
      <Label className="font-medium text-text-label" htmlFor={id}>
        {label}
      </Label>
      <Popover onOpenChange={setOpen} open={open}>
        <PopoverTrigger asChild>
          <button
            aria-describedby={error ? errorId : undefined}
            className={FIELD_BUTTON_CLASS}
            data-invalid={error ? true : undefined}
            id={id}
            type="button"
          >
            <span
              className={cn({
                "text-text-muted": !selected,
                "text-text-primary": selected,
              })}
            >
              {selected ? birthDateFormatter.format(selected) : PLACEHOLDER}
            </span>
            <CalendarIcon
              aria-hidden="true"
              className="shrink-0 text-text-muted"
              size={16}
            />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto">
          <div className="w-80">
            <Calendar
              aria-label="Birth date"
              defaultMonth={
                selected ?? atNoonUtc(yearsBefore(today, DEFAULT_YEARS_BACK))
              }
              disabled={{ after: atNoonUtc(latestAllowed) }}
              onSelect={choose}
              selected={selected}
              timeZone={timeZone}
              yearRange={{
                from: today.year - MAX_BOOKING_AGE,
                to: latestAllowed.year,
              }}
            />
          </div>
        </PopoverContent>
      </Popover>
      <FieldError id={errorId} message={error} />
    </div>
  );
}

type CalendarDate = { day: number; month: number; year: number };

function calendarDateOf(isoDate: string): CalendarDate {
  const [year, month, day] = isoDate.split("-").map(Number);

  return { day: day ?? 1, month: month ?? 1, year: year ?? 0 };
}

function yearsBefore(date: CalendarDate, years: number): CalendarDate {
  return { ...date, year: date.year - years };
}

function atNoonUtc(date: CalendarDate): Date {
  return new Date(Date.UTC(date.year, date.month - 1, date.day, NOON_UTC));
}
