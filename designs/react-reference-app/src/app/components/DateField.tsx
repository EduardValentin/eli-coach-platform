import {
  forwardRef,
  useState,
  type ComponentPropsWithoutRef,
  type FocusEvent,
} from 'react';
import { format, isValid, parseISO } from 'date-fns';
import type { Matcher } from 'react-day-picker';
import { BrandCalendar, type YearRange } from './BrandCalendar';
import { DateFieldTrigger } from './DateFieldTrigger';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

const ISO_DATE = 'yyyy-MM-dd';

type DateFieldProps = Omit<
  ComponentPropsWithoutRef<'button'>,
  'value' | 'onChange'
> & {
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

export const DateField = forwardRef<HTMLButtonElement, DateFieldProps>(
  function DateField(
    {
      value,
      onChange,
      placeholder = 'Pick a date',
      yearRange,
      disabledDays,
      defaultMonth,
      onBlur,
      ...buttonProps
    },
    ref,
  ) {
    const [open, setOpen] = useState(false);
    const selected = parseDate(value);

    const leaveField = (event: FocusEvent<HTMLButtonElement>) => {
      if (open) return;
      onBlur?.(event);
    };

    return (
      <Popover modal open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <DateFieldTrigger
            text={selected ? format(selected, 'd MMMM yyyy') : ''}
            placeholder={placeholder}
            onBlur={leaveField}
            ref={ref}
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
  },
);
