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
  type PropsRangeRequired,
  type PropsSingle,
} from "react-day-picker";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "../lib/cn";
import {
  IconButton,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../primitives";

const CHEVRON_SIZE = 16;

const monthNavButtonClassName =
  "absolute -top-0.5 z-10 inline-flex size-8 items-center justify-center rounded-control border border-control-border-soft bg-transparent p-0 font-medium opacity-50 transition-colors hover:bg-surface-quiet hover:opacity-100";

const captionNavButtonClassName =
  "inline-flex size-8 shrink-0 items-center justify-center rounded-control border border-control-border-soft p-0 text-text-primary transition-colors hover:bg-surface-quiet";

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

// The range's middle days are selected too, so their entry follows `selected`
// and wins the merge.
const dayModifierClassNames: Record<string, string> = {
  selected:
    "bg-brand-primary text-text-inverted hover:bg-brand-primary-hover hover:text-text-inverted",
  range_middle:
    "bg-brand-primary-soft text-brand-primary hover:bg-brand-primary-soft hover:text-brand-primary",
  today: "ring-2 ring-brand-primary/30",
  outside: "text-text-secondary hover:bg-surface-quiet",
  disabled: "opacity-50 hover:bg-transparent",
};

function CalendarChevron({ orientation }: ChevronProps) {
  const Chevron = orientation === "right" ? ChevronRight : ChevronLeft;

  return <Chevron aria-hidden="true" size={CHEVRON_SIZE} />;
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

export type CalendarYearRange = { from: number; to: number };

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

type CalendarBaseProps = Pick<
  PropsBase,
  | "className"
  | "defaultMonth"
  | "disabled"
  | "labels"
  | "modifiers"
  | "month"
  | "onMonthChange"
  | "today"
> & {
  "aria-label": string;
  timeZone: string;
  yearRange?: CalendarYearRange;
};

type CalendarSingleProps = CalendarBaseProps &
  Partial<Pick<PropsSingle, "mode">> &
  Pick<PropsSingle, "onSelect" | "selected">;

type CalendarRangeProps = CalendarBaseProps &
  Pick<PropsRangeRequired, "mode" | "onSelect" | "selected">;

export type CalendarProps = CalendarSingleProps | CalendarRangeProps;

function selectionProps(
  props: CalendarProps,
): PropsSingle | PropsRangeRequired {
  if (props.mode === "range") {
    return {
      mode: "range",
      onSelect: props.onSelect,
      required: true,
      selected: props.selected,
    };
  }

  return { mode: "single", onSelect: props.onSelect, selected: props.selected };
}

export function Calendar(props: CalendarProps) {
  const {
    "aria-label": ariaLabel,
    className,
    defaultMonth,
    disabled,
    labels,
    modifiers,
    month,
    onMonthChange,
    timeZone,
    today,
    yearRange,
  } = props;

  return (
    <DayPicker
      className={className}
      defaultMonth={defaultMonth}
      disabled={disabled}
      modifiers={modifiers}
      month={month}
      onMonthChange={onMonthChange}
      timeZone={timeZone}
      today={today}
      {...(yearRange ? yearRangeCaptionProps(yearRange) : plainCaptionProps)}
      {...selectionProps(props)}
      fixedWeeks
      labels={{
        labelGrid: (date, options, dateLib) =>
          `${ariaLabel}, ${labelGrid(date, options, dateLib)}`,
        ...labels,
      }}
      navLayout="around"
      showOutsideDays
    />
  );
}
