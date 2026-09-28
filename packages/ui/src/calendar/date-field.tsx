import { CalendarDays } from "lucide-react";
import * as React from "react";
import type { Matcher } from "react-day-picker";

import { cn } from "../lib/cn";
import { useDisplayTimeZone } from "../lib/use-display-time-zone";
import { Popover, PopoverContent, PopoverTrigger } from "../primitives";
import { fieldSizeClasses } from "../primitives/field-size";
import { Calendar, type CalendarYearRange } from "./calendar";

const TRIGGER_CLASS =
  "flex w-full items-center justify-between gap-2 rounded-field border border-control-border-soft bg-surface-base text-left transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-feedback-danger";

const ICON_SIZE = 16;

const NOON_UTC = 12;

const FIELD_TAB_INDEX = 0;

const spelledOutDate = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
  year: "numeric",
});

type DateFieldProps = Omit<
  React.ComponentPropsWithoutRef<"button">,
  "defaultValue" | "onChange" | "value"
> & {
  calendarLabel: string;
  defaultMonth?: Date;
  disabledDays?: Matcher | Matcher[];
  onChange: (isoDate: string) => void;
  placeholder?: string;
  value: string;
  yearRange?: CalendarYearRange;
};

export const DateField = React.forwardRef<HTMLButtonElement, DateFieldProps>(
  (
    {
      calendarLabel,
      className,
      defaultMonth,
      disabledDays,
      onChange,
      placeholder = "Pick a date",
      value,
      yearRange,
      ...buttonProps
    },
    ref,
  ) => {
    const [open, setOpen] = React.useState(false);
    const timeZone = useDisplayTimeZone(null);
    const selected = noonUtcOf(value);

    const choose = (date: Date | undefined) => {
      if (!date) {
        return;
      }

      onChange(isoDateOf(date, timeZone));
      setOpen(false);
    };

    return (
      <Popover modal onOpenChange={setOpen} open={open}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              TRIGGER_CLASS,
              fieldSizeClasses({ size: "md" }),
              className,
            )}
            ref={ref}
            tabIndex={FIELD_TAB_INDEX}
            type="button"
            {...buttonProps}
          >
            <span className={cn({ "text-text-muted": !selected })}>
              {selected ? spelledOutDate.format(selected) : placeholder}
            </span>
            <CalendarDays
              aria-hidden="true"
              className="text-text-muted"
              size={ICON_SIZE}
            />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-80"
          onFocusOutside={(event) => event.preventDefault()}
        >
          <Calendar
            aria-label={calendarLabel}
            defaultMonth={selected ?? defaultMonth}
            disabled={disabledDays}
            onSelect={choose}
            selected={selected}
            timeZone={timeZone}
            yearRange={yearRange}
          />
        </PopoverContent>
      </Popover>
    );
  },
);

DateField.displayName = "DateField";

function noonUtcOf(isoDate: string): Date | undefined {
  const [year, month, day] = isoDate.split("-").map(Number);

  if (!year || !month || !day) {
    return undefined;
  }

  return new Date(Date.UTC(year, month - 1, day, NOON_UTC));
}

function isoDateOf(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((entry) => entry.type === type)?.value;

  return `${part("year")}-${part("month")}-${part("day")}`;
}
