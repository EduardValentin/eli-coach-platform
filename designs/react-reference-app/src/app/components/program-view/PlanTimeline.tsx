import { useEffect, useRef, useState } from 'react';
import { addDays, differenceInCalendarDays, format } from 'date-fns';
import { BLOCK_TYPE_LABELS, type Block, type Weekday } from '../../domain/program';
import { blockDates, blockStatus, checkpointsWithin, currentPosition, planWeeks } from '../../domain/programCalendar';
import { formatJourneyDate } from '../../utils/journeyLabels';
import { HintPopover } from '../HintPopover';
import { Badge } from '../ui/badge';
import { cn } from '../ui/utils';
import { BLOCK_SOFT, BLOCK_SWATCH } from './blockColours';
import { HoveredDayLabel, HoveredDayLine, useHoveredDay } from './TimelineHover';

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
    <HintPopover hint={exact} side="bottom" align="center">
      <button
        type="button"
        aria-label={`Today · ${exact}`}
        className={cn('hit-area absolute top-1/2 -translate-y-1/2 cursor-default rounded-tile text-sm font-semibold whitespace-nowrap text-text-primary', {
          '-translate-x-1/2': marker.offset >= MARKER_EDGE && marker.offset <= 1 - MARKER_EDGE,
          '-translate-x-full': marker.offset > 1 - MARKER_EDGE,
        })}
        style={{ left: `${marker.offset * 100}%` }}
      >
        {`Today · week ${marker.weekOfPlan}`}
      </button>
    </HintPopover>
  );
}

function useScrollCue(weeks: number) {
  const scroller = useRef<HTMLDivElement>(null);
  const [moreToTheRight, setMoreToTheRight] = useState(false);

  useEffect(() => {
    const element = scroller.current;
    if (!element) return;
    const update = () => setMoreToTheRight(element.scrollLeft + element.clientWidth < element.scrollWidth - 1);
    update();
    element.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      element.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [weeks]);

  return { scroller, moreToTheRight };
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
  const { hovered, pointerHandlers } = useHoveredDay(start, planDays);
  const { scroller, moreToTheRight } = useScrollCue(weeks);

  return (
    <figure className="rounded-card border border-border bg-surface-base">
      <div className="relative">
        <div ref={scroller} role="group" aria-label="Plan timeline" tabIndex={0} className="overflow-x-auto rounded-t-card px-6 pt-5 pb-3">
          <div className="relative grid" style={{ minWidth: `${weeks * REM_PER_WEEK}rem` }} {...pointerHandlers}>
            {marker && (
              <div className="relative min-h-12 text-sm font-semibold text-text-primary tabular-nums">
                <TodayMarkerLabel marker={marker} today={today} />
              </div>
            )}
            <div className="relative">
              <div className="relative">
                <ol aria-label="Plan blocks" className="flex min-h-14">
                  {blocks.map((block, index) => {
                    const status = blockStatus({ blocks, dayOne, today }, index).kind;
                    const label = `${BLOCK_TYPE_LABELS[block.type]} · ${block.weeks} wk`;
                    return (
                      <li
                        key={block.id}
                        aria-current={status === 'current' ? 'step' : undefined}
                        title={label}
                        className={cn(
                          '@container relative flex min-w-0 items-center gap-2 border-l-2 border-surface-base px-3 py-2 text-sm first:rounded-l-tile first:border-l-0 last:rounded-r-tile',
                          BLOCK_SOFT[block.type],
                          { 'opacity-60': status === 'ended' },
                        )}
                        style={{ flexGrow: block.weeks, flexBasis: 0 }}
                      >
                        <span aria-hidden="true" className={cn('absolute inset-x-0 top-0 h-0.5 rounded-t-[inherit]', BLOCK_SWATCH[block.type])} />
                        <Badge tone="count-on-fill" className="relative z-[1]">
                          {index + 1}
                        </Badge>
                        <span
                          aria-hidden="true"
                          className={cn('min-w-0 break-words text-text-primary', {
                            'font-semibold': status === 'current',
                            'font-medium': status !== 'current',
                          })}
                        >
                          <span className="@max-[11.5em]:hidden">{label}</span>
                          <span className="hidden @max-[11.5em]:inline @max-[5.75em]:hidden">{BLOCK_TYPE_LABELS[block.type]}</span>
                        </span>
                        <span className="sr-only">{`${label}, from ${formatJourneyDate(dates[index].date)}`}</span>
                      </li>
                    );
                  })}
                </ol>
                {marker && (
                  <span aria-hidden="true" className="pointer-events-none absolute -top-3.5 bottom-0 w-0.5 -translate-x-1/2 rounded-full bg-text-primary" style={{ left: `${marker.offset * 100}%` }} />
                )}
              </div>
              <div aria-hidden="true" className="relative flex min-h-[2em] text-xs tabular-nums text-text-label">
                {blocks.map((block, index) => (
                  <span key={block.id} className="flex min-w-0 flex-wrap justify-between gap-x-2 pt-1.5 pr-1" style={{ flexGrow: block.weeks, flexBasis: 0 }}>
                    <span>{format(dates[index].date, SHORT_DATE)}</span>
                    {index === blocks.length - 1 && <span className="ml-auto">{format(dates[lastDate].date, SHORT_DATE)}</span>}
                  </span>
                ))}
                {hovered && <HoveredDayLabel hovered={hovered} />}
              </div>
              <ol aria-hidden="true" className="mt-1 flex border-t border-border text-caption leading-none tabular-nums text-text-secondary">
                {Array.from({ length: weeks }, (_, week) => (
                  <li key={week} className="relative flex flex-1 justify-center border-l border-border pt-2 last:border-r">
                    {week + 1}
                  </li>
                ))}
              </ol>
              {hovered && <HoveredDayLine hovered={hovered} />}
            </div>
            <ul aria-label="Check-in forms" className="relative h-[3.75em] text-xs">
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
        {moreToTheRight && <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-10 rounded-tr-card bg-gradient-to-l from-surface-base to-transparent" />}
      </div>
      <figcaption className="flex items-center gap-2 border-t border-border-subtle px-6 py-2.5 text-xs text-text-secondary">
        <span aria-hidden="true" className="size-2 rounded-full bg-brand-secondary" />
        Check-in form
      </figcaption>
    </figure>
  );
}

type PlanStripGap = 'tight' | 'wide';

type PlanStripProps = {
  blocks: readonly Block[];
  dayOne: Date | null;
  today?: Date;
  gap?: PlanStripGap;
};

const PLAN_STRIP_GAP_CLASS: Record<PlanStripGap, string> = {
  tight: 'gap-0.5',
  wide: 'gap-1',
};

export function PlanStrip({ blocks, dayOne, today, gap = 'tight' }: PlanStripProps) {
  const schedule = today ? { blocks, dayOne, today } : null;
  return (
    <span aria-hidden="true" className={cn('flex h-1.5', PLAN_STRIP_GAP_CLASS[gap])}>
      {blocks.map((block, index) => (
        <span
          key={block.id}
          className={cn('rounded-full', BLOCK_SWATCH[block.type], {
            'opacity-40': schedule !== null && blockStatus(schedule, index).kind === 'ended',
          })}
          style={{ flexGrow: block.weeks, flexBasis: 0 }}
        />
      ))}
    </span>
  );
}
