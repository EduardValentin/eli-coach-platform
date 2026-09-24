import * as React from "react";
import type { DateRange } from "react-day-picker";

import { Popover, PopoverContent, PopoverTrigger } from "../primitives";
import { Calendar, type CalendarYearRange } from "./calendar";
import {
  DateFieldTrigger,
  type DateFieldTriggerSize,
} from "./date-field-trigger";

export type IsoDateRange = { from: string | null; to: string | null };

// Calendar days carry no zone of their own, so the picker reads and writes
// them as UTC days and every conversion below stays on the UTC accessors.
const DAY_ZONE = "UTC";
const PICKS_THAT_COMPLETE_A_RANGE = 2;

type DateRangeFieldProps = Omit<
  React.ComponentPropsWithoutRef<"button">,
  "aria-label" | "children" | "onChange" | "type" | "value"
> & {
  "aria-label": string;
  onChange: (range: IsoDateRange) => void;
  placeholder?: string;
  size?: DateFieldTriggerSize;
  value: IsoDateRange;
  yearRange?: CalendarYearRange;
};

export function DateRangeField({
  "aria-label": ariaLabel,
  onChange,
  placeholder = "Pick dates",
  size,
  value,
  yearRange,
  ...triggerProps
}: DateRangeFieldProps) {
  const [open, setOpen] = React.useState(false);
  const [daysPickedSinceOpen, setDaysPickedSinceOpen] = React.useState(0);
  const from = utcDayOf(value.from);
  const to = utcDayOf(value.to);

  const openPicker = () => {
    setDaysPickedSinceOpen(0);
    setOpen(true);
  };

  const closePicker = () => setOpen(false);

  const chooseRange = (range: DateRange | undefined) => {
    const daysPicked = daysPickedSinceOpen + 1;

    onChange({ from: isoDayOf(range?.from), to: isoDayOf(range?.to) });
    setDaysPickedSinceOpen(daysPicked);

    if (daysPicked >= PICKS_THAT_COMPLETE_A_RANGE) {
      closePicker();
    }
  };

  return (
    <Popover
      onOpenChange={(next) => (next ? openPicker() : closePicker())}
      open={open}
    >
      <PopoverTrigger asChild>
        <DateFieldTrigger
          aria-label={ariaLabel}
          placeholder={placeholder}
          size={size}
          text={labelFor(from, to)}
          {...triggerProps}
        />
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <Calendar
          aria-label={ariaLabel}
          defaultMonth={from}
          mode="range"
          onSelect={chooseRange}
          selected={from ? { from, to } : undefined}
          timeZone={DAY_ZONE}
          yearRange={yearRange}
        />
      </PopoverContent>
    </Popover>
  );
}

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

function utcDayOf(isoDay: string | null): Date | undefined {
  const match = isoDay === null ? null : ISO_DAY.exec(isoDay);

  if (match === null) {
    return undefined;
  }

  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return isoDayOf(date) === isoDay ? date : undefined;
}

function isoDayOf(date: Date | undefined): string | null {
  if (!date) {
    return null;
  }

  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${date.getUTCFullYear()}-${month}-${day}`;
}

const dayMonthFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: DAY_ZONE,
});

// Assembled from parts so the month reads "Sep" in every runtime; en-GB's
// short month spells it "Sept" in some.
function formatDay(date: Date, wording: "dayMonth" | "dayMonthYear"): string {
  const parts = dayMonthFormatter.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value ?? "";
  const dayMonth = `${part("day")} ${part("month")}`;

  return wording === "dayMonth"
    ? dayMonth
    : `${dayMonth} ${date.getUTCFullYear()}`;
}

function labelFor(from: Date | undefined, to: Date | undefined): string {
  if (!from) {
    return "";
  }

  if (!to) {
    return `${formatDay(from, "dayMonth")} – …`;
  }

  if (from.getUTCFullYear() !== to.getUTCFullYear()) {
    return `${formatDay(from, "dayMonthYear")} – ${formatDay(to, "dayMonthYear")}`;
  }

  return `${formatDay(from, "dayMonth")} – ${formatDay(to, "dayMonthYear")}`;
}
