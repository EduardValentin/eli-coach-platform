import { useState, type ComponentProps } from 'react';
import { format, isValid, parseISO } from 'date-fns';
import type { DateRange as PickerRange } from 'react-day-picker';
import { BrandCalendar, type YearRange } from './BrandCalendar';
import { DateFieldTrigger } from './DateFieldTrigger';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

const ISO_DATE = 'yyyy-MM-dd';

const RANGE_MODIFIER_CLASSNAMES = {
  range_middle:
    'bg-brand-soft! text-brand! hover:bg-brand-soft! hover:text-brand!',
};

export type IsoDateRange = { from: string | null; to: string | null };

type DateRangeFieldProps = Omit<
  ComponentProps<'button'>,
  'value' | 'onChange'
> & {
  value: IsoDateRange;
  onChange: (range: IsoDateRange) => void;
  placeholder?: string;
  defaultMonth?: Date;
  yearRange?: YearRange;
};

function parseDay(value: string | null): Date | undefined {
  if (value === null) return undefined;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : undefined;
}

function toIsoDay(date: Date | undefined): string | null {
  return date ? format(date, ISO_DATE) : null;
}

function labelFor(from: Date | undefined, to: Date | undefined): string {
  if (!from) return '';
  if (!to) return `${format(from, 'd MMM')} – …`;
  if (from.getFullYear() !== to.getFullYear()) {
    return `${format(from, 'd MMM yyyy')} – ${format(to, 'd MMM yyyy')}`;
  }
  return `${format(from, 'd MMM')} – ${format(to, 'd MMM yyyy')}`;
}

export function DateRangeField({
  value,
  onChange,
  placeholder = 'Pick dates',
  defaultMonth,
  yearRange,
  ...buttonProps
}: DateRangeFieldProps) {
  const [open, setOpen] = useState(false);
  const [picks, setPicks] = useState(0);
  const from = parseDay(value.from);
  const to = parseDay(value.to);

  const openPicker = (next: boolean) => {
    setOpen(next);
    if (next) setPicks(0);
  };

  const chooseRange = (range: PickerRange | undefined) => {
    onChange({ from: toIsoDay(range?.from), to: toIsoDay(range?.to) });
    setPicks(picks + 1);
    if (picks > 0) setOpen(false);
  };

  return (
    <Popover modal open={open} onOpenChange={openPicker}>
      <PopoverTrigger asChild>
        <DateFieldTrigger
          text={labelFor(from, to)}
          placeholder={placeholder}
          {...buttonProps}
        />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-80 p-3"
        onFocusOutside={(event) => event.preventDefault()}
      >
        <BrandCalendar
          fixedWeeks
          required
          mode="range"
          modifiersClassNames={RANGE_MODIFIER_CLASSNAMES}
          selected={from ? { from, to } : undefined}
          defaultMonth={from ?? defaultMonth}
          yearRange={yearRange}
          onSelect={chooseRange}
        />
      </PopoverContent>
    </Popover>
  );
}
