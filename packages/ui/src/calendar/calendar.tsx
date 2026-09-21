import {
  DayButton,
  DayPicker,
  defaultDateLib,
  labelGrid,
  useDayPicker,
  type ChevronProps,
  type ClassNames,
  type CustomComponents,
  type DayButtonProps,
  type MonthCaptionProps,
  type PropsBase,
  type PropsSingle,
} from "react-day-picker";

import { cn } from "../lib/cn";
import {
  IconButton,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../primitives";

const monthNavButtonClassName =
  "absolute -top-0.5 z-10 inline-flex size-8 items-center justify-center rounded-control border border-control-border-soft bg-transparent p-0 font-medium opacity-50 transition-colors hover:bg-surface-quiet hover:opacity-100";

const captionNavButtonClassName =
  "inline-flex size-8 shrink-0 items-center justify-center rounded-control border border-control-border-soft text-text-primary transition-colors hover:bg-surface-quiet";

const calendarClassNames: Partial<ClassNames> = {
  root: "w-full",
  months: "flex w-full flex-col",
  month: "relative flex w-full flex-col gap-4",
  month_caption: "relative flex w-full items-center justify-center pt-1",
  caption_label: "text-sm font-semibold text-text-primary",
  button_previous: cn(monthNavButtonClassName, "left-1"),
  button_next: cn(monthNavButtonClassName, "right-1"),
  month_grid: "w-full border-collapse",
  weekdays: "flex w-full",
  weekday:
    "flex h-10 flex-1 items-center justify-center rounded-field text-caption font-semibold uppercase tracking-wider text-text-secondary",
  week: "mt-1 flex w-full",
  day: "relative flex-1 p-0 text-center text-sm focus-within:relative focus-within:z-20 aria-selected:rounded-control",
  day_button:
    "relative inline-flex aspect-square w-full items-center justify-center rounded-control p-0 text-base font-medium transition-colors hover:bg-surface-muted",
  hidden: "invisible",
};

const yearRangeClassNames: Partial<ClassNames> = {
  ...calendarClassNames,
  month_caption: "flex w-full items-center gap-2 pt-1",
};

const dayModifierClassNames: Record<string, string> = {
  selected:
    "bg-brand-primary text-text-inverted hover:bg-brand-primary-hover hover:text-text-inverted",
  today: "ring-2 ring-brand-primary/30",
  outside: "text-text-secondary hover:bg-surface-quiet",
  disabled: "opacity-50 hover:bg-transparent",
};

const CHEVRON_PATHS = {
  left: "M69.490332,3.34314575 C72.6145263,0.218951416 77.6798462,0.218951416 80.8040405,3.34314575 C83.8617626,6.40086786 83.9268205,11.3179931 80.9992143,14.4548388 L80.8040405,14.6568542 L35.461,60 L80.8040405,105.343146 C83.8617626,108.400868 83.9268205,113.317993 80.9992143,116.454839 L80.8040405,116.656854 C77.7463184,119.714576 72.8291931,119.779634 69.6923475,116.852028 L69.490332,116.656854 L18.490332,65.6568542 C15.4326099,62.5991321 15.367552,57.6820069 18.2951583,54.5451612 L18.490332,54.3431458 L69.490332,3.34314575 Z",
  right:
    "M49.8040405,3.34314575 C46.6798462,0.218951416 41.6145263,0.218951416 38.490332,3.34314575 C35.4326099,6.40086786 35.367552,11.3179931 38.2951583,14.4548388 L38.490332,14.6568542 L83.8333725,60 L38.490332,105.343146 C35.4326099,108.400868 35.367552,113.317993 38.2951583,116.454839 L38.490332,116.656854 C41.5480541,119.714576 46.4651794,119.779634 49.602025,116.852028 L49.8040405,116.656854 L100.804041,65.6568542 C103.861763,62.5991321 103.926821,57.6820069 100.999214,54.5451612 L100.804041,54.3431458 L49.8040405,3.34314575 Z",
};

function CalendarChevron({ orientation }: ChevronProps) {
  return (
    <svg aria-hidden="true" height="16px" viewBox="0 0 120 120" width="16px">
      <path
        d={orientation === "right" ? CHEVRON_PATHS.right : CHEVRON_PATHS.left}
        fill="currentColor"
      />
    </svg>
  );
}

function CalendarDayButton(props: DayButtonProps) {
  const activeModifierClassNames = Object.entries(dayModifierClassNames)
    .filter(([modifier]) => props.modifiers[modifier])
    .map(([, className]) => className);

  return (
    <DayButton
      {...props}
      aria-disabled={props.modifiers.disabled || undefined}
      className={cn(props.className, activeModifierClassNames)}
    />
  );
}

const MONTH_LABELS = Array.from({ length: 12 }, (_, month) =>
  new Date(2000, month, 1).toLocaleDateString("en-GB", { month: "long" }),
);

function yearsDescending(from: number, to: number) {
  return Array.from({ length: to - from + 1 }, (_, index) => to - index);
}

function MonthYearCaption({
  calendarMonth,
  displayIndex: _displayIndex,
  ...divProps
}: MonthCaptionProps) {
  const { dayPickerProps, goToMonth, nextMonth, previousMonth } =
    useDayPicker();
  const { endMonth, startMonth } = dayPickerProps;
  const displayMonth = calendarMonth.date;
  const years =
    startMonth && endMonth
      ? yearsDescending(startMonth.getFullYear(), endMonth.getFullYear())
      : [];

  return (
    <div {...divProps}>
      <IconButton
        aria-label="Previous month"
        className={captionNavButtonClassName}
        disabled={!previousMonth}
        onClick={() => previousMonth && goToMonth(previousMonth)}
        variant="plain"
      >
        <CalendarChevron orientation="left" />
      </IconButton>

      <div className="flex flex-1 items-center gap-2">
        <Select
          onValueChange={(month) =>
            goToMonth(defaultDateLib.setMonth(displayMonth, Number(month)))
          }
          value={String(displayMonth.getMonth())}
        >
          <SelectTrigger aria-label="Month" className="h-8 flex-1 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="z-[60]">
            {MONTH_LABELS.map((label, month) => (
              <SelectItem key={label} value={String(month)}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          onValueChange={(year) =>
            goToMonth(defaultDateLib.setYear(displayMonth, Number(year)))
          }
          value={String(displayMonth.getFullYear())}
        >
          <SelectTrigger aria-label="Year" className="h-8 w-[5.5rem] text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="z-[60]">
            {years.map((year) => (
              <SelectItem key={year} value={String(year)}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <IconButton
        aria-label="Next month"
        className={captionNavButtonClassName}
        disabled={!nextMonth}
        onClick={() => nextMonth && goToMonth(nextMonth)}
        variant="plain"
      >
        <CalendarChevron orientation="right" />
      </IconButton>
    </div>
  );
}

const calendarComponents: Partial<CustomComponents> = {
  Chevron: CalendarChevron,
  DayButton: CalendarDayButton,
};

const yearRangeComponents: Partial<CustomComponents> = {
  ...calendarComponents,
  MonthCaption: MonthYearCaption,
};

// Noon UTC on the first of the month stays in that month in every zone, so
// the range boundaries hold once DayPicker re-reads them in the calendar's
// time zone.
function monthBoundary(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex, 1, 12));
}

type CalendarYearRange = { from: number; to: number };

const plainCaptionProps = {
  classNames: calendarClassNames,
  components: calendarComponents,
};

function yearRangeCaptionProps({ from, to }: CalendarYearRange) {
  return {
    classNames: yearRangeClassNames,
    components: yearRangeComponents,
    endMonth: monthBoundary(to, 11),
    hideNavigation: true,
    startMonth: monthBoundary(from, 0),
  };
}

export type CalendarProps = Pick<
  PropsBase,
  | "className"
  | "defaultMonth"
  | "disabled"
  | "labels"
  | "modifiers"
  | "month"
  | "onMonthChange"
  | "today"
> &
  Pick<PropsSingle, "onSelect" | "selected"> & {
    "aria-label": string;
    timeZone: string;
    yearRange?: CalendarYearRange;
  };

export function Calendar({
  "aria-label": ariaLabel,
  labels,
  yearRange,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      {...props}
      {...(yearRange ? yearRangeCaptionProps(yearRange) : plainCaptionProps)}
      fixedWeeks
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
