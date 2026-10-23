import { addDays, differenceInCalendarDays, format } from 'date-fns';
import { BLOCK_TYPE_LABELS, type Block, type Weekday } from '../../domain/program';
import { blockDates, blockStatus, checkpointsWithin, currentPosition, planWeeks } from '../../domain/programCalendar';
import { formatJourneyDate } from '../../utils/journeyLabels';
import { Badge } from '../ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { cn } from '../ui/utils';
import { BLOCK_SOFT, BLOCK_SWATCH } from './blockColours';

const DAYS_PER_WEEK = 7;
const REM_PER_WEEK = 3.5;
const SHORT_DATE = 'd MMM';
const EXACT_DATE = 'd MMMM yyyy';

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

type TodayMarker = { offset: number; weekOfPlan: number };

const MARKER_EDGE = 0.08;

function todayMarker(blocks: readonly Block[], dayOne: Date | null, today: Date): TodayMarker | null {
  const position = currentPosition(blocks, dayOne, today);
  if (!dayOne || position.status !== 'in-plan') return null;
  return { offset: differenceInCalendarDays(today, dayOne) / (planWeeks(blocks) * DAYS_PER_WEEK), weekOfPlan: position.weekOfPlan };
}

function TodayMarkerLabel({ marker, today }: { marker: TodayMarker; today: Date }) {
  const exact = `${format(today, EXACT_DATE)} · week ${marker.weekOfPlan}`;
  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        aria-label={`Today · ${exact}`}
        className={cn('absolute top-0 cursor-default rounded-sm text-xs font-semibold whitespace-nowrap text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring', {
          '-translate-x-1/2': marker.offset >= MARKER_EDGE && marker.offset <= 1 - MARKER_EDGE,
          '-translate-x-full': marker.offset > 1 - MARKER_EDGE,
        })}
        style={{ left: `${marker.offset * 100}%` }}
      >
        {`Today · week ${marker.weekOfPlan}`}
      </TooltipTrigger>
      <TooltipContent>{exact}</TooltipContent>
    </Tooltip>
  );
}

export function PlanTimeline({ blocks, dayOne, preferredWeekday, today }: PlanTimelineProps) {
  const weeks = planWeeks(blocks);
  const start = dayOne ?? today;
  const planDays = weeks * DAYS_PER_WEEK;
  const planEnd = addDays(start, planDays - 1);
  const checkpoints = checkpointsWithin(start, preferredWeekday, planEnd);
  const dates = boundaries(blocks, start);
  const lastDate = dates.length - 1;
  const marker = todayMarker(blocks, dayOne, today);

  return (
    <figure className="overflow-hidden rounded-card border border-border bg-surface-base">
      <div
        role="group"
        aria-label="Plan timeline"
        tabIndex={0}
        className="overflow-x-auto px-6 pt-5 pb-3 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-inset"
      >
        <div className="relative grid" style={{ minWidth: `${weeks * REM_PER_WEEK}rem` }}>
          {marker && (
            <p className="relative h-6 text-xs font-semibold text-text-primary tabular-nums">
              <TodayMarkerLabel marker={marker} today={today} />
            </p>
          )}
          <ol aria-label="Plan blocks" className="flex h-14 overflow-hidden rounded-tile">
            {blocks.map((block, index) => {
              const status = blockStatus({ blocks, dayOne, today }, index).kind;
              const label = `${BLOCK_TYPE_LABELS[block.type]} · ${block.weeks} wk`;
              return (
                <li
                  key={block.id}
                  aria-current={status === 'current' ? 'step' : undefined}
                  title={label}
                  className={cn('@container relative flex min-w-0 items-center gap-2 border-l-2 border-surface-base px-3 first:border-l-0', BLOCK_SOFT[block.type], {
                    'opacity-60': status === 'ended',
                  })}
                  style={{ flexGrow: block.weeks, flexBasis: 0 }}
                >
                  <span aria-hidden="true" className={cn('absolute inset-x-0 top-0 h-0.5', BLOCK_SWATCH[block.type])} />
                  <Badge tone="count" className="opacity-100">
                    {index + 1}
                  </Badge>
                  <span
                    aria-hidden="true"
                    className={cn('min-w-0 truncate text-sm text-text-primary', {
                      'font-semibold': status === 'current',
                      'font-medium': status !== 'current',
                    })}
                  >
                    <span className="@max-[9.5rem]:hidden">{label}</span>
                    <span className="hidden @max-[9.5rem]:inline @max-[4.5rem]:hidden">{BLOCK_TYPE_LABELS[block.type]}</span>
                  </span>
                  <span className="sr-only">{`${label}, from ${formatJourneyDate(dates[index].date)}`}</span>
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
          {marker && (
            <span
              aria-hidden="true"
              className="absolute top-5 bottom-11 w-0.5 -translate-x-1/2 rounded-full bg-text-primary"
              style={{ left: `${marker.offset * 100}%` }}
            />
          )}
        </div>
      </div>
      <figcaption className="flex items-center gap-2 border-t border-border-subtle px-6 py-2.5 text-xs text-text-secondary">
        <span aria-hidden="true" className="size-2 rounded-full bg-brand-secondary" />
        Check-in form
      </figcaption>
    </figure>
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
            'opacity-40': blockStatus({ blocks, dayOne, today }, index).kind === 'ended',
          })}
          style={{ flexGrow: block.weeks, flexBasis: 0 }}
        />
      ))}
    </span>
  );
}
