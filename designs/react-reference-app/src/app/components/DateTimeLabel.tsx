import {
  browserTimeZone,
  formatShortDay,
  formatSlotTime,
} from '../utils/dateFormatters';
import { cn } from './ui/utils';

type DateTimeLabelSize = 'sm' | 'md';

const DAY_CLASS: Record<DateTimeLabelSize, string> = {
  sm: 'text-sm font-medium text-text-primary',
  md: 'text-base font-medium text-text-primary',
};

interface DateTimeLabelProps {
  startsAt: Date;
  timeZone?: string;
  size?: DateTimeLabelSize;
  className?: string;
}

export function DateTimeLabel({
  startsAt,
  timeZone = browserTimeZone(),
  size = 'md',
  className,
}: DateTimeLabelProps) {
  return (
    <span
      className={cn(
        'inline-flex flex-wrap items-baseline gap-x-1.5',
        className,
      )}
    >
      <span className={DAY_CLASS[size]}>
        {formatShortDay(startsAt, timeZone)}
      </span>
      <span className="text-sm text-text-secondary">
        · {formatSlotTime(startsAt, timeZone)}
      </span>
    </span>
  );
}
