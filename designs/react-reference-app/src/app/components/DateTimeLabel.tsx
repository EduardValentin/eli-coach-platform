import {
  browserTimeZone,
  formatShortDay,
  formatSlotTime,
} from '../utils/dateFormatters';
import { cn } from './ui/utils';

interface DateTimeLabelProps {
  startsAt: Date;
  timeZone?: string;
  className?: string;
}

export function DateTimeLabel({
  startsAt,
  timeZone = browserTimeZone(),
  className,
}: DateTimeLabelProps) {
  return (
    <span
      className={cn(
        'inline-flex flex-wrap items-baseline gap-x-1.5',
        className,
      )}
    >
      <span className="text-base font-semibold text-text-primary">
        {formatShortDay(startsAt, timeZone)}
      </span>
      <span className="text-sm text-text-secondary">
        · {formatSlotTime(startsAt, timeZone)}
      </span>
    </span>
  );
}
