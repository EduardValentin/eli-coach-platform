import { createContext, useContext, useMemo, type ComponentProps } from 'react';
import {
  DayButton,
  DayPicker,
  useDayPicker,
  type ChevronProps,
  type DayButtonProps,
  type MonthCaptionProps,
} from 'react-day-picker';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from './ui/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

const navButtonClass =
  'size-8 shrink-0 inline-flex items-center justify-center rounded-control border border-control-border-soft text-text-primary hover:bg-surface-quiet transition-colors disabled:pointer-events-none disabled:opacity-50';

const monthNavButtonClass =
  'size-8 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center rounded-control border border-control-border-soft hover:bg-surface-quiet transition-colors absolute z-10 -top-0.5';

const BRAND_CLASSNAMES = {
  months: 'flex flex-col w-full',
  month: 'relative flex flex-col gap-4 w-full',
  month_caption: 'flex justify-center pt-1 relative items-center w-full',
  caption_label: 'text-sm font-semibold text-text-primary',
  button_previous: `${monthNavButtonClass} left-1`,
  button_next: `${monthNavButtonClass} right-1`,
  month_grid: 'w-full border-collapse',
  weekdays: 'flex w-full',
  weekday:
    'text-text-secondary rounded-field flex-1 h-10 font-semibold text-caption uppercase tracking-wider flex items-center justify-center',
  week: 'flex w-full mt-1',
  day: 'relative p-0 text-center text-sm focus-within:relative focus-within:z-20 flex-1 aria-selected:rounded-control',
  day_button:
    'w-full aspect-square p-0 font-medium rounded-control hover:bg-surface-muted transition-colors inline-flex items-center justify-center relative',
};

const BRAND_DAY_MODIFIER_CLASSNAMES: Record<string, string> = {
  selected:
    'bg-brand text-white hover:bg-brand-hover! hover:text-white',
  today: 'ring-2 ring-brand/30',
  outside: 'text-text-secondary hover:bg-surface-quiet',
  disabled: 'opacity-50 hover:bg-transparent',
};

const DayModifierClassNames = createContext<Record<string, string>>(
  BRAND_DAY_MODIFIER_CLASSNAMES,
);

export function BrandDayButton(props: DayButtonProps) {
  const modifierClassNames = useContext(DayModifierClassNames);
  const activeModifierClasses = Object.entries(props.modifiers)
    .filter(([, isActive]) => isActive)
    .map(([modifier]) => modifierClassNames[modifier])
    .filter(Boolean);

  return (
    <DayButton
      {...props}
      className={[props.className, ...activeModifierClasses].join(' ')}
    />
  );
}

const DROPDOWN_CAPTION_CLASSNAMES = {
  month_caption: 'flex w-full items-center gap-2 pt-1',
};

const MONTH_LABELS = Array.from({ length: 12 }, (_, month) =>
  new Date(2000, month, 1).toLocaleDateString('en-GB', { month: 'long' }),
);

export type YearRange = { from: number; to: number };

function BrandChevron({ orientation }: ChevronProps) {
  const Chevron = orientation === 'right' ? ChevronRight : ChevronLeft;

  return <Chevron size={16} aria-hidden="true" />;
}

/**
 * Replaces the default caption when a caller needs to reach a distant year — a
 * birth date, say, where paging one month at a time is not a navigation.
 *
 * Built from the app's own Select rather than react-day-picker's
 * `captionLayout="dropdown"`: that path styles itself through the
 * library's stylesheet, which this app never imports, so its labels and value
 * echoes render unstyled and overlap the nav buttons.
 */
function createMonthYearCaption({ from, to }: YearRange) {
  const years = Array.from({ length: to - from + 1 }, (_, index) => to - index);

  return function MonthYearCaption({
    calendarMonth,
    displayIndex: _displayIndex,
    ...divProps
  }: MonthCaptionProps) {
    const { goToMonth, previousMonth, nextMonth } = useDayPicker();
    const displayMonth = calendarMonth.date;

    return (
      <div {...divProps}>
        <button
          type="button"
          aria-label="Previous month"
          disabled={!previousMonth}
          onClick={() => previousMonth && goToMonth(previousMonth)}
          className={navButtonClass}
        >
          <ChevronLeft size={16} aria-hidden="true" />
        </button>

        <div className="flex flex-1 items-center gap-2">
          <Select
            value={String(displayMonth.getMonth())}
            onValueChange={(month) =>
              goToMonth(new Date(displayMonth.getFullYear(), Number(month), 1))
            }
          >
            <SelectTrigger aria-label="Month" size="sm" className="flex-1">
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
            value={String(displayMonth.getFullYear())}
            onValueChange={(year) =>
              goToMonth(new Date(Number(year), displayMonth.getMonth(), 1))
            }
          >
            <SelectTrigger aria-label="Year" size="sm" className="w-[5.5rem]">
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

        <button
          type="button"
          aria-label="Next month"
          disabled={!nextMonth}
          onClick={() => nextMonth && goToMonth(nextMonth)}
          className={navButtonClass}
        >
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>
    );
  };
}

// DayPicker's props are a union discriminated by `mode`, and an interface
// cannot extend a union — doing so silently produced a props type with no
// members, so every caller's `mode`, `selected` and `modifiers` went unchecked.
type BrandCalendarProps = ComponentProps<typeof DayPicker> & {
  /** Opts into month and year selects in place of the plain month caption. */
  yearRange?: YearRange;
};

export function BrandCalendar({
  classNames,
  className,
  components,
  modifiersClassNames,
  showOutsideDays = true,
  yearRange,
  ...props
}: BrandCalendarProps) {
  const captionComponents = useMemo(
    () =>
      yearRange ? { MonthCaption: createMonthYearCaption(yearRange) } : null,
    [yearRange?.from, yearRange?.to],
  );
  const dayModifierClassNames = useMemo(
    () => ({ ...BRAND_DAY_MODIFIER_CLASSNAMES, ...modifiersClassNames }),
    [modifiersClassNames],
  );

  return (
    <DayModifierClassNames.Provider value={dayModifierClassNames}>
      <DayPicker
        showOutsideDays={showOutsideDays}
        navLayout="around"
        fixedWeeks
        hideNavigation={Boolean(yearRange)}
        className={cn('w-full', className)}
        classNames={{
          ...BRAND_CLASSNAMES,
          ...(yearRange ? DROPDOWN_CAPTION_CLASSNAMES : null),
          ...classNames,
        }}
        components={{
          Chevron: BrandChevron,
          DayButton: BrandDayButton,
          ...captionComponents,
          ...components,
        }}
        {...props}
      />
    </DayModifierClassNames.Provider>
  );
}
