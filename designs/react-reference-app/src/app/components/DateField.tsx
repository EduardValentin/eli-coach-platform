import { useState, type ComponentProps } from 'react';
import { CalendarDays } from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';
import type { Matcher } from 'react-day-picker';
import { BrandCalendar, type YearRange } from './BrandCalendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { cn } from './ui/utils';

const ISO_DATE = 'yyyy-MM-dd';

const TRIGGER_CLASS =
  'flex h-12 w-full items-center justify-between gap-2 rounded-field border border-control-border-soft bg-surface-quiet/50 px-3 text-left text-base transition-[color,box-shadow] outline-none md:text-sm disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive';

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
  className,
  ...buttonProps
}: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const selected = parseDate(value);

  return (
    <Popover modal open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(TRIGGER_CLASS, className)}
          {...buttonProps}
        >
          <span className={cn(!selected && 'text-muted-foreground')}>
            {selected ? format(selected, 'd MMMM yyyy') : placeholder}
          </span>
          <CalendarDays
            size={16}
            className="text-muted-foreground"
            aria-hidden="true"
          />
        </button>
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
