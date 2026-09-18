import type * as React from "react";
import {
  DayPicker,
  labelGrid,
  type ClassNames,
  type CustomComponents,
  type PropsBase,
  type PropsSingle,
} from "react-day-picker";

import { cn } from "../lib/cn";
import { IconButton } from "../primitives";

const calendarClassNames: Partial<ClassNames> = {
  root: "w-full max-w-full text-text-primary",
  months: "flex flex-col gap-6",
  month: "grid grid-cols-[auto_1fr_auto] items-center gap-x-2 gap-y-4",
  month_caption: "text-center",
  caption_label: "text-body-sm font-semibold text-text-primary",
  chevron: "size-4 fill-current",
  month_grid: "col-span-3 w-full table-fixed border-collapse",
  weekday:
    "h-10 p-0 align-middle text-label font-semibold uppercase tracking-wider text-text-secondary",
  day: "group px-0 pb-0 pt-1 text-center align-middle",
  day_button: cn(
    "mx-auto aspect-square w-full max-w-11 rounded-sm text-body-base font-medium outline-none",
    "motion-safe:transition-colors motion-safe:duration-150 motion-safe:ease-out",
    "hover:bg-surface-subtle",
    "focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary",
    "disabled:opacity-40 disabled:hover:bg-transparent",
    "group-data-[today=true]:ring-2 group-data-[today=true]:ring-brand-primary/30",
    "group-data-[outside=true]:text-text-secondary",
    "group-data-[selected=true]:bg-brand-primary group-data-[selected=true]:text-brand-primary-foreground group-data-[selected=true]:hover:bg-brand-primary-hover group-data-[selected=true]:focus:bg-brand-primary",
  ),
  hidden: "invisible",
};

function MonthNavButton({
  "aria-label": ariaLabel,
  className,
  ...props
}: React.ComponentPropsWithoutRef<"button">) {
  return (
    <IconButton
      aria-label={ariaLabel ?? ""}
      className={cn(
        "text-text-muted hover:text-brand-primary aria-disabled:opacity-30",
        className,
      )}
      size="sm"
      {...props}
    />
  );
}

const monthNavComponents: Partial<CustomComponents> = {
  NextMonthButton: MonthNavButton,
  PreviousMonthButton: MonthNavButton,
};

export type CalendarProps = Pick<
  PropsBase,
  | "className"
  | "components"
  | "defaultMonth"
  | "disabled"
  | "endMonth"
  | "labels"
  | "modifiers"
  | "modifiersClassNames"
  | "month"
  | "onMonthChange"
  | "startMonth"
  | "today"
> &
  Pick<PropsSingle, "onSelect" | "selected"> & {
    "aria-label": string;
    timeZone: string;
  };

export function Calendar({
  "aria-label": ariaLabel,
  components,
  labels,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      {...props}
      classNames={calendarClassNames}
      components={{ ...monthNavComponents, ...components }}
      labels={{
        labelGrid: (date, options, dateLib) =>
          `${ariaLabel}, ${labelGrid(date, options, dateLib)}`,
        ...labels,
      }}
      mode="single"
      navLayout="around"
      showOutsideDays
    />
  );
}
