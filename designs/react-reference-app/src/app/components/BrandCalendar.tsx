import { useMemo, type ComponentProps } from 'react';
import { DayPicker, useNavigation, type CaptionProps } from 'react-day-picker';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from './ui/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

const BRAND_CLASSNAMES = {
  months: 'flex flex-col w-full',
  month: 'flex flex-col gap-4 w-full',
  caption: 'flex justify-center pt-1 relative items-center w-full',
  caption_label: 'text-sm font-semibold text-text-primary',
  nav: 'flex items-center gap-1',
  nav_button:
    'size-8 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center rounded-lg border border-neutral-200 hover:bg-neutral-50 transition-colors',
  nav_button_previous: 'absolute left-1',
  nav_button_next: 'absolute right-1',
  table: 'w-full border-collapse',
  head_row: 'flex w-full',
  head_cell:
    'text-neutral-600 rounded-md flex-1 h-10 font-semibold text-[11px] uppercase tracking-wider flex items-center justify-center',
  row: 'flex w-full mt-1',
  cell: 'relative p-0 text-center text-sm focus-within:relative focus-within:z-20 flex-1 [&:has([aria-selected])]:rounded-xl',
  day: 'w-full aspect-square p-0 font-medium rounded-xl hover:bg-neutral-100 transition-colors aria-selected:opacity-100 inline-flex items-center justify-center relative',
  day_selected:
    'bg-brand text-white hover:bg-brand-hover hover:text-white focus:bg-brand focus:text-white',
  day_today: 'ring-2 ring-brand/30',
  day_outside: 'text-neutral-600 hover:bg-neutral-50',
  day_disabled: 'text-neutral-300 opacity-50 hover:bg-transparent',
};

const MONTH_LABELS = Array.from({ length: 12 }, (_, month) =>
  new Date(2000, month, 1).toLocaleDateString('en-GB', { month: 'long' }),
);

export type YearRange = { from: number; to: number };

const navButtonClass =
  'size-8 shrink-0 inline-flex items-center justify-center rounded-lg border border-neutral-200 text-text-primary hover:bg-neutral-50 disabled:opacity-30 disabled:hover:bg-transparent transition-colors';

/**
 * Replaces the default caption when a caller needs to reach a distant year — a
 * birth date, say, where paging one month at a time is not a navigation.
 *
 * Built from the app's own Select rather than react-day-picker's
 * `captionLayout="dropdown-buttons"`: that path styles itself through the
 * library's stylesheet, which this app never imports, so its labels and value
 * echoes render unstyled and overlap the nav buttons.
 */
function createMonthYearCaption({ from, to }: YearRange) {
  const years = Array.from({ length: to - from + 1 }, (_, index) => to - index);

  return function MonthYearCaption({ displayMonth }: CaptionProps) {
    const { goToMonth, previousMonth, nextMonth } = useNavigation();

    return (
      <div className="flex items-center gap-2 pt-1">
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
            value={String(displayMonth.getFullYear())}
            onValueChange={(year) =>
              goToMonth(new Date(Number(year), displayMonth.getMonth(), 1))
            }
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
  showOutsideDays = true,
  yearRange,
  ...props
}: BrandCalendarProps) {
  const captionComponents = useMemo(
    () => (yearRange ? { Caption: createMonthYearCaption(yearRange) } : null),
    [yearRange?.from, yearRange?.to],
  );

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('w-full', className)}
      classNames={{ ...BRAND_CLASSNAMES, ...classNames }}
      components={{ ...captionComponents, ...components }}
      {...props}
    />
  );
}
