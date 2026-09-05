import * as React from "react";
import { Popover as RadixPopover } from "radix-ui";
import { DayPicker, useNavigation, type CaptionProps } from "react-day-picker";
import { format, parseISO } from "date-fns";

import { cn } from "../lib/cn";
import { inputClasses } from "./input";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const NAV_BUTTON =
  "inline-flex size-8 shrink-0 items-center justify-center rounded-field text-text-muted outline-none transition-colors hover:bg-surface-subtle hover:text-text-primary disabled:opacity-40 focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary";

const CAPTION_SELECT =
  "h-8 rounded-field border border-border-subtle bg-surface-base px-2 text-body-sm text-text-primary outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary";

/**
 * The caption is replaced rather than paged, because a birth date is not a
 * navigation: reaching 1996 one month at a time is three hundred clicks. Plain
 * selects rather than the library's own dropdown layout, which styles itself
 * through a stylesheet this app never imports.
 */
function monthYearCaption(fromYear: number, toYear: number) {
  const years = Array.from({ length: toYear - fromYear + 1 }, (_, i) => toYear - i);

  return function Caption({ displayMonth }: CaptionProps) {
    const { goToMonth, nextMonth, previousMonth } = useNavigation();

    return (
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          aria-label="Previous month"
          disabled={!previousMonth}
          onClick={() => previousMonth && goToMonth(previousMonth)}
          className={NAV_BUTTON}
        >
          ‹
        </button>
        <div className="flex flex-1 items-center gap-2">
          <select
            aria-label="Month"
            className={cn(CAPTION_SELECT, "flex-1")}
            value={displayMonth.getMonth()}
            onChange={(event) =>
              goToMonth(
                new Date(displayMonth.getFullYear(), Number(event.target.value), 1),
              )
            }
          >
            {MONTHS.map((label, month) => (
              <option key={label} value={month}>
                {label}
              </option>
            ))}
          </select>
          <select
            aria-label="Year"
            className={cn(CAPTION_SELECT, "w-22")}
            value={displayMonth.getFullYear()}
            onChange={(event) =>
              goToMonth(
                new Date(Number(event.target.value), displayMonth.getMonth(), 1),
              )
            }
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          aria-label="Next month"
          disabled={!nextMonth}
          onClick={() => nextMonth && goToMonth(nextMonth)}
          className={NAV_BUTTON}
        >
          ›
        </button>
      </div>
    );
  };
}

export type DateFieldProps = {
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  fromYear: number;
  id: string;
  onChange: (value: string) => void;
  placeholder?: string;
  toYear: number;
  /** ISO `YYYY-MM-DD`, or empty. */
  value: string;
};

/**
 * A date chosen from a calendar rather than typed into a native date input,
 * which renders a different control in every browser and cannot reach a distant
 * year without paging.
 */
export function DateField({
  fromYear,
  id,
  onChange,
  placeholder = "Select a date",
  toYear,
  value,
  ...control
}: DateFieldProps) {
  const [open, setOpen] = React.useState(false);
  const selected = value ? parseISO(value) : undefined;
  const Caption = React.useMemo(
    () => monthYearCaption(fromYear, toYear),
    [fromYear, toYear],
  );

  return (
    <RadixPopover.Root open={open} onOpenChange={setOpen}>
      <RadixPopover.Trigger asChild>
        <button
          {...control}
          id={id}
          type="button"
          className={cn(
            inputClasses({ controlSize: "none", variant: "portal" }),
            "items-center justify-between gap-2 font-medium text-left",
          )}
        >
          <span className={selected ? "text-text-primary" : "text-text-muted"}>
            {selected ? format(selected, "d MMMM yyyy") : placeholder}
          </span>
          <span aria-hidden="true" className="shrink-0 text-text-muted">
            ▾
          </span>
        </button>
      </RadixPopover.Trigger>
      <RadixPopover.Portal>
        <RadixPopover.Content
          align="start"
          sideOffset={6}
          className="z-50 w-auto rounded-field-multiline border border-border-subtle bg-surface-base p-3 shadow-raised"
        >
          <div className="w-72">
            <DayPicker
              mode="single"
              selected={selected}
              defaultMonth={selected ?? new Date(toYear, 0)}
              fromYear={fromYear}
              toYear={toYear}
              components={{ Caption }}
              onSelect={(date) => {
                onChange(date ? format(date, "yyyy-MM-dd") : "");
                if (date) setOpen(false);
              }}
              classNames={{
                months: "flex flex-col",
                month: "space-y-3",
                table: "w-full border-collapse",
                head_row: "flex",
                head_cell:
                  "flex-1 text-count-badge/normal font-bold uppercase tracking-widest text-text-muted",
                row: "mt-1 flex w-full",
                cell: "relative flex-1 p-0 text-center",
                day: "inline-flex aspect-square w-full items-center justify-center rounded-field text-body-sm outline-none transition-colors hover:bg-surface-subtle focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-brand-primary",
                day_selected:
                  "bg-brand-primary text-text-inverted hover:bg-brand-primary-hover",
                day_today: "font-semibold text-brand-primary",
                day_outside: "text-text-muted opacity-50",
                day_disabled: "opacity-40",
              }}
            />
          </div>
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}
