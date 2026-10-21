import { addDays, differenceInCalendarDays } from 'date-fns';
import { BLOCK_TYPE_LABELS, type Block, type Weekday } from '../../../domain/program';
import { blockDates, blockStatus, checkpointsWithin, planWeeks } from '../../../domain/programCalendar';
import { formatJourneyDate } from '../../../utils/journeyLabels';
import { cn } from '../../ui/utils';
import { BLOCK_SOFT, BLOCK_SWATCH, WEEKDAY_LABELS } from './program-constants';

const DAYS_PER_WEEK = 7;

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
  const startText = dayOne ? ` from ${formatJourneyDate(dayOne)}` : '';

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
        {`${weeks} weeks${startText} · ▲ check-in form every 14 days, on ${WEEKDAY_LABELS[preferredWeekday]}`}
      </figcaption>
    </figure>
  );
}

type CompactPlanTimelineProps = {
  blocks: readonly Block[];
  dayOne: Date | null;
  today: Date;
};

function todayOffset(blocks: readonly Block[], dayOne: Date | null, today: Date): number | null {
  if (!dayOne) return null;
  const elapsed = differenceInCalendarDays(today, dayOne);
  const planDays = planWeeks(blocks) * DAYS_PER_WEEK;
  return elapsed >= 0 && elapsed < planDays ? (elapsed / planDays) * 100 : null;
}

export function CompactPlanTimeline({ blocks, dayOne, today }: CompactPlanTimelineProps) {
  const offset = todayOffset(blocks, dayOne, today);
  const lastIndex = blocks.length - 1;

  return (
    <div className="grid grid-cols-1 gap-3">
      <div className="relative">
        <ol aria-label="Plan" className="flex h-9 gap-1">
          {blocks.map((block, index) => {
            const status = blockStatus(blocks, index, dayOne, today).kind;
            return (
              <li
                key={block.id}
                aria-current={status === 'current' ? 'step' : undefined}
                className={cn(
                  'relative flex min-w-10 items-center overflow-hidden rounded-tile px-2 text-xs',
                  BLOCK_SOFT[block.type],
                  {
                    'font-semibold text-text-primary': status === 'current',
                    'text-text-secondary': status === 'upcoming',
                    'text-text-secondary opacity-60': status === 'ended',
                  },
                )}
                style={{ flexGrow: block.weeks, flexBasis: 0 }}
              >
                <span
                  aria-hidden="true"
                  className={cn('absolute inset-x-0 top-0', BLOCK_SWATCH[block.type], status === 'current' ? 'h-1' : 'h-0.5')}
                />
                <span className="truncate">{`${BLOCK_TYPE_LABELS[block.type]} · ${block.weeks} wk`}</span>
              </li>
            );
          })}
        </ol>
        {offset !== null && (
          <span
            aria-hidden="true"
            className="absolute top-full mt-1 size-1.5 -translate-x-1/2 rounded-full bg-text-primary"
            style={{ left: `${offset}%` }}
          />
        )}
      </div>
      {dayOne && lastIndex >= 0 && (
        <p className="flex justify-between text-xs tabular-nums text-text-secondary">
          <span>{formatJourneyDate(dayOne)}</span>
          <span>{formatJourneyDate(blockDates(blocks, lastIndex, dayOne).end)}</span>
        </p>
      )}
    </div>
  );
}
