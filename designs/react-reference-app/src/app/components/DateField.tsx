import { useState, type ComponentProps } from 'react';
import { format, isValid, parseISO } from 'date-fns';
import type { Matcher } from 'react-day-picker';
import { BrandCalendar, type YearRange } from './BrandCalendar';
import { DateFieldTrigger } from './DateFieldTrigger';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

const ISO_DATE = 'yyyy-MM-dd';

type DateFieldProps = Omit<ComponentProps<'button'>, 'value' | 'onChange'> & {
  value: string;
  onChange: (isoDate: string) => void;
  placeholder?: string;
  yearRange?: YearRange;
  disabledDays?: Matcher | Matcher[];
  defaultMonth?: Date;
};

function parseDate(value: string): Date | undefined {
  if (value.length === 0) return undefined;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : undefined;
}

export function DateField({
  value,
  onChange,
  placeholder = 'Pick a date',
  yearRange,
  disabledDays,
  defaultMonth,
  ...buttonProps
}: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const selected = parseDate(value);

  return (
    <Popover modal open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <DateFieldTrigger
          text={selected ? format(selected, 'd MMMM yyyy') : ''}
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
          mode="single"
          selected={selected}
          defaultMonth={selected ?? defaultMonth}
          disabled={disabledDays}
          yearRange={yearRange}
          onSelect={(date) => {
            if (!date) return;
            onChange(format(date, ISO_DATE));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
