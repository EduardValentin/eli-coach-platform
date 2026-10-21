import type { ReactNode } from 'react';
import { addDays, differenceInCalendarDays, format } from 'date-fns';
import { CalendarRange, ClipboardCheck, Flag, type LucideIcon } from 'lucide-react';
import { BLOCK_TYPE_LABELS, type Block, type Weekday } from '../../../domain/program';
import { blockDates, blockStatus, checkpointDate, checkpointsWithin, nextCheckpoint, planWeeks } from '../../../domain/programCalendar';
import { formatJourneyDate } from '../../../utils/journeyLabels';
import { Badge } from '../../ui/badge';
import { cn } from '../../ui/utils';
import { BLOCK_SOFT, BLOCK_SWATCH } from './program-constants';

const DAYS_PER_WEEK = 7;
const REM_PER_WEEK = 3.5;
const SHORT_DATE = 'd MMM';

type PlanTimelineProps = {
  blocks: readonly Block[];
  dayOne: Date | null;
  preferredWeekday: Weekday;
  today: Date;
};

type Boundary = { date: Date; offset: number };

function percent(days: number, planDays: number): string {
  return `${(days / planDays) * 100}%`;
}

function boundaries(blocks: readonly Block[], start: Date): Boundary[] {
  const planDays = planWeeks(blocks) * DAYS_PER_WEEK;
  const starts = blocks.map((_, index) => {
    const date = blockDates(blocks, index, start).start;
    return { date, offset: differenceInCalendarDays(date, start) / planDays };
  });
  return [...starts, { date: blockDates(blocks, blocks.length - 1, start).end, offset: 1 }];
}

function SummaryChip({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <li className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-base px-3 py-1.5 text-sm text-text-primary">
      <Icon aria-hidden="true" size={16} className="text-text-secondary" />
      {children}
    </li>
  );
}

function nextCheckInForm({ dayOne, preferredWeekday, today }: Omit<PlanTimelineProps, 'blocks'>, planEnd: Date): Date | null {
  const next = dayOne ? nextCheckpoint(dayOne, preferredWeekday, today) : checkpointDate(today, preferredWeekday, 1);
  return next <= planEnd ? next : null;
}

export function PlanTimeline({ blocks, dayOne, preferredWeekday, today }: PlanTimelineProps) {
  const weeks = planWeeks(blocks);
  const start = dayOne ?? today;
  const planDays = weeks * DAYS_PER_WEEK;
  const planEnd = addDays(start, planDays - 1);
  const checkpoints = checkpointsWithin(start, preferredWeekday, planEnd);
  const next = nextCheckInForm({ dayOne, preferredWeekday, today }, planEnd);
  const dates = boundaries(blocks, start);
  const lastDate = dates.length - 1;

  return (
    <div className="grid grid-cols-1 gap-4">
      <ul aria-label="Plan summary" className="flex flex-wrap gap-2">
        <SummaryChip icon={CalendarRange}>{`${weeks} weeks`}</SummaryChip>
        <SummaryChip icon={Flag}>{dayOne ? `Starts ${formatJourneyDate(dayOne)}` : 'Starts on publication'}</SummaryChip>
        {next && <SummaryChip icon={ClipboardCheck}>{`Next check-in form ${formatJourneyDate(next)}`}</SummaryChip>}
      </ul>
      <figure className="overflow-hidden rounded-card border border-border bg-surface-base">
        <div
          role="group"
          aria-label="Plan timeline"
          tabIndex={0}
          className="overflow-x-auto px-6 pt-5 pb-3 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-inset"
        >
          <div className="grid" style={{ minWidth: `${weeks * REM_PER_WEEK}rem` }}>
            <ol className="flex h-14 overflow-hidden rounded-tile">
              {blocks.map((block, index) => {
                const status = blockStatus(blocks, index, dayOne, today).kind;
                return (
                  <li
                    key={block.id}
                    aria-current={status === 'current' ? 'step' : undefined}
                    className={cn('relative flex min-w-0 items-center gap-2 border-l-2 border-surface-base px-3 first:border-l-0', BLOCK_SOFT[block.type], {
                      'opacity-60': status === 'ended',
                    })}
                    style={{ flexGrow: block.weeks, flexBasis: 0 }}
                  >
                    <span aria-hidden="true" className={cn('absolute inset-x-0 top-0 h-0.5', BLOCK_SWATCH[block.type])} />
                    <Badge tone="count" className="opacity-100">
                      {index + 1}
                    </Badge>
                    <span
                      className={cn('truncate text-sm text-text-primary', {
                        'font-semibold': status === 'current',
                        'font-medium': status !== 'current',
                      })}
                    >
                      {`${BLOCK_TYPE_LABELS[block.type]} · ${block.weeks} wk`}
                    </span>
                    <span className="sr-only">{`, from ${formatJourneyDate(dates[index].date)}`}</span>
                  </li>
                );
              })}
            </ol>
            <div aria-hidden="true" className="relative h-6 text-xs tabular-nums text-text-label">
              {dates.map((boundary, index) => (
                <span
                  key={boundary.offset}
                  className={cn('absolute top-1.5 whitespace-nowrap', {
                    '-translate-x-1/2': index > 0 && index < lastDate,
                    '-translate-x-full': index === lastDate,
                  })}
                  style={{ left: `${boundary.offset * 100}%` }}
                >
                  {format(boundary.date, SHORT_DATE)}
                </span>
              ))}
            </div>
            <ol aria-hidden="true" className="mt-1 flex border-t border-border text-[11px] leading-none tabular-nums text-text-secondary">
              {Array.from({ length: weeks }, (_, week) => (
                <li key={week} className="relative flex flex-1 justify-center border-l border-border pt-2 last:border-r">
                  {week + 1}
                </li>
              ))}
            </ol>
            <ul aria-label="Check-in forms" className="relative h-11">
              {checkpoints.map(checkpoint => (
                <li
                  key={checkpoint.getTime()}
                  className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
                  style={{
                    left: percent(differenceInCalendarDays(checkpoint, start), planDays),
                  }}
                >
                  <span aria-hidden="true" className="h-3 w-px bg-brand-secondary/50" />
                  <Badge tone="brand-secondary" className="tabular-nums">
                    <time dateTime={format(checkpoint, 'yyyy-MM-dd')}>{format(checkpoint, SHORT_DATE)}</time>
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <figcaption className="flex items-center gap-2 border-t border-border-subtle px-6 py-2.5 text-xs text-text-secondary">
          <span aria-hidden="true" className="size-2 rounded-full bg-brand-secondary" />
          Check-in form
        </figcaption>
      </figure>
    </div>
  );
}

type PlanStripProps = {
  blocks: readonly Block[];
  dayOne: Date | null;
  today: Date;
};

export function PlanStrip({ blocks, dayOne, today }: PlanStripProps) {
  return (
    <span aria-hidden="true" className="flex h-1.5 gap-0.5">
      {blocks.map((block, index) => (
        <span
          key={block.id}
          className={cn('rounded-full', BLOCK_SWATCH[block.type], {
            'opacity-40': blockStatus(blocks, index, dayOne, today).kind === 'ended',
          })}
          style={{ flexGrow: block.weeks, flexBasis: 0 }}
        />
      ))}
    </span>
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
                className={cn('relative flex min-w-10 items-center overflow-hidden rounded-tile px-2 text-xs', BLOCK_SOFT[block.type], {
                  'font-semibold text-text-primary': status === 'current',
                  'text-text-secondary': status === 'upcoming',
                  'text-text-secondary opacity-60': status === 'ended',
                })}
                style={{ flexGrow: block.weeks, flexBasis: 0 }}
              >
                <span aria-hidden="true" className={cn('absolute inset-x-0 top-0', BLOCK_SWATCH[block.type], status === 'current' ? 'h-1' : 'h-0.5')} />
                <span className="truncate">{`${BLOCK_TYPE_LABELS[block.type]} · ${block.weeks} wk`}</span>
              </li>
            );
          })}
        </ol>
        {offset !== null && (
          <span aria-hidden="true" className="absolute top-full mt-1 size-1.5 -translate-x-1/2 rounded-full bg-text-primary" style={{ left: `${offset}%` }} />
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
