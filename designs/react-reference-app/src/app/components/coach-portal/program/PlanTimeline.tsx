import { addDays, differenceInCalendarDays } from 'date-fns';
import { BLOCK_TYPE_LABELS, type Block, type Weekday } from '../../../domain/program';
import { checkpointsWithin, planWeeks } from '../../../domain/programCalendar';
import { formatJourneyDate } from '../../../utils/journeyLabels';
import { cn } from '../../ui/utils';
import { BLOCK_SOFT, BLOCK_SWATCH } from './program-constants';

const DAYS_PER_WEEK = 7;
const WEEKDAY_NAMES: Record<Weekday, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

type PlanTimelineProps = {
  blocks: readonly Block[];
  dayOne: Date | null;
  preferredWeekday: Weekday;
  today: Date;
};

export function PlanTimeline({ blocks, dayOne, preferredWeekday, today }: PlanTimelineProps) {
  const weeks = planWeeks(blocks);
  const start = dayOne ?? today;
  const planDays = weeks * DAYS_PER_WEEK;
  const checkpoints = weeks > 0 ? checkpointsWithin(start, preferredWeekday, addDays(start, planDays - 1)) : [];
  const dayOneText = dayOne ? formatJourneyDate(dayOne) : 'the day you publish';

  return (
    <figure className="grid grid-cols-1 gap-2">
      <div className="relative pt-4">
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-4">
          {checkpoints.map(checkpoint => (
            <span
              key={checkpoint.getTime()}
              className="absolute -translate-x-1/2 text-xs leading-none text-text-secondary"
              style={{ left: `${(differenceInCalendarDays(checkpoint, start) / planDays) * 100}%` }}
            >
              ▲
            </span>
          ))}
        </div>
        <ol className="flex h-12 overflow-hidden rounded-field border border-border">
          {blocks.map((block, index) => (
            <li
              key={block.id}
              className={cn('relative flex min-w-0 items-center border-r border-border px-2 last:border-r-0', BLOCK_SOFT[block.type])}
              style={{ flexGrow: block.weeks, flexBasis: 0 }}
            >
              <span aria-hidden="true" className={cn('absolute inset-x-0 top-0 h-1', BLOCK_SWATCH[block.type])} />
              <span className="truncate text-xs font-medium text-text-primary">
                {`${index + 1} ${BLOCK_TYPE_LABELS[block.type]} · ${block.weeks} wk`}
              </span>
            </li>
          ))}
        </ol>
        <div aria-hidden="true" className="flex h-1.5">
          {Array.from({ length: weeks }, (_, week) => (
            <span key={week} className="flex-1 border-l border-border last:border-r" />
          ))}
        </div>
      </div>
      <figcaption className="text-xs text-text-secondary">
        {`${weeks} weeks · day 1 is ${dayOneText} · ▲ check-in form every 14 days, on her preferred ${WEEKDAY_NAMES[preferredWeekday]}`}
      </figcaption>
    </figure>
  );
}
