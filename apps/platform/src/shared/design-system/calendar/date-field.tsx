import { CalendarDays } from "lucide-react";
import * as React from "react";
import type { Matcher } from "react-day-picker";

import { useDisplayTimeZone } from "../lib/use-display-time-zone";
import {
  FieldTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../primitives";
import { Calendar, type CalendarYearRange } from "./calendar";

const ICON_SIZE = 16;

const NOON_UTC = 12;

const spelledOutDateFormatter = new Intl.DateTimeFormat("en-GB", {
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
      onBlur,
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

    const leaveField = (event: React.FocusEvent<HTMLButtonElement>) => {
      if (open) {
        return;
      }

      onBlur?.(event);
    };

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
          <FieldTrigger
            className={className}
            data-placeholder={selected ? undefined : ""}
            icon={
              <CalendarDays
                aria-hidden="true"
                className="text-text-muted"
                size={ICON_SIZE}
              />
            }
            onBlur={leaveField}
            ref={ref}
            {...buttonProps}
          >
            <span>
              {selected
                ? spelledOutDateFormatter.format(selected)
                : placeholder}
            </span>
          </FieldTrigger>
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
