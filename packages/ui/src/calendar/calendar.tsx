import {
  DayButton,
  DayPicker,
  labelGrid,
  type ChevronProps,
  type ClassNames,
  type CustomComponents,
  type DayButtonProps,
  type PropsBase,
  type PropsSingle,
} from "react-day-picker";

import { cn } from "../lib/cn";

const monthNavButtonClassName =
  "absolute -top-0.5 z-10 inline-flex size-8 items-center justify-center rounded-calendar-nav border border-control-border-soft bg-transparent p-0 font-medium opacity-50 transition-colors hover:bg-surface-quiet hover:opacity-100";

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
    "flex h-10 flex-1 items-center justify-center rounded-lg text-calendar-weekday font-semibold uppercase tracking-wider text-text-secondary",
  week: "mt-1 flex w-full",
  day: "relative flex-1 p-0 text-center text-sm focus-within:relative focus-within:z-20 aria-selected:rounded-xl",
  day_button:
    "relative inline-flex aspect-square w-full items-center justify-center rounded-xl p-0 text-base font-medium transition-colors hover:bg-surface-muted",
  hidden: "invisible",
};

const dayModifierClassNames: Record<string, string> = {
  selected:
    "bg-brand-primary text-text-inverted hover:bg-brand-primary-hover hover:text-text-inverted focus:bg-brand-primary focus:text-text-inverted",
  today: "ring-2 ring-brand-primary/30",
  outside: "text-text-secondary",
  disabled: "text-text-disabled opacity-50 hover:bg-transparent",
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
  const activeModifierClassNames = Object.entries(props.modifiers)
    .filter(([, isActive]) => isActive)
    .map(([modifier]) => dayModifierClassNames[modifier]);

  return (
    <DayButton
      {...props}
      className={cn(props.className, activeModifierClassNames)}
    />
  );
}

const calendarComponents: Partial<CustomComponents> = {
  Chevron: CalendarChevron,
  DayButton: CalendarDayButton,
};

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
  };

export function Calendar({
  "aria-label": ariaLabel,
  labels,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      {...props}
      classNames={calendarClassNames}
      components={calendarComponents}
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
