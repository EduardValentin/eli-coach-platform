import { useState } from 'react';
import { format, parseISO, startOfMonth, subYears } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { MAX_BOOKING_AGE, MIN_BOOKING_AGE } from '../../services/visitorProfile';
import { FIELD_ERROR_CLASS } from '../../utils/formFieldStyles';
import { BrandCalendar } from '../BrandCalendar';
import { Label } from '../ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { cn } from '../ui/utils';

const DEFAULT_YEARS_BACK = 30;
const PLACEHOLDER = 'Select a date';

// The trigger is a button that has to read as one of the form's fields, so it
// carries the Input primitive's frame rather than a button variant.
const FIELD_BUTTON_CLASS =
  'flex h-12 w-full min-w-0 items-center justify-between gap-2 rounded-field border border-control-border-soft bg-surface-quiet/50 px-3 py-1 text-left text-base outline-none transition-[color,box-shadow] md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:border-destructive aria-invalid:ring-destructive/20';

export function DateOfBirthField({
  id,
  label,
  value,
  error,
  now,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  error?: string;
  now: Date;
  onChange: (isoDate: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const latestAllowed = subYears(now, MIN_BOOKING_AGE);
  const earliestAllowed = subYears(now, MAX_BOOKING_AGE);
  const selected = value ? parseISO(value) : undefined;
  const errorId = `${id}-error`;

  const choose = (date: Date | undefined) => {
    onChange(date ? format(date, 'yyyy-MM-dd') : '');
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-text-label font-medium">
        {label}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            className={FIELD_BUTTON_CLASS}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={error ? errorId : undefined}
          >
            <span
              className={cn({
                'text-text-primary': selected,
                'text-muted-foreground': !selected,
              })}
            >
              {selected ? format(selected, 'd MMMM yyyy') : PLACEHOLDER}
            </span>
            <CalendarIcon
              size={16}
              className="text-muted-foreground shrink-0"
              aria-hidden="true"
            />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-3">
          <div className="w-[18rem]">
            <BrandCalendar
              mode="single"
              yearRange={{
                from: earliestAllowed.getFullYear(),
                to: latestAllowed.getFullYear(),
              }}
              startMonth={startOfMonth(earliestAllowed)}
              endMonth={latestAllowed}
              defaultMonth={selected ?? subYears(now, DEFAULT_YEARS_BACK)}
              selected={selected}
              disabled={{ after: latestAllowed }}
              onSelect={choose}
            />
          </div>
        </PopoverContent>
      </Popover>
      {error && (
        <p id={errorId} className={FIELD_ERROR_CLASS}>
          {error}
        </p>
      )}
    </div>
  );
}
