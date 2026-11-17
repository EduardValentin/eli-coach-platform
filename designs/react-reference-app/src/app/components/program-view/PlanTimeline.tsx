import { format } from 'date-fns';
import { useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import { Link } from 'react-router';
import { BLOCK_TYPE_LABELS, isBlockWritten, type Block, type Weekday } from '../../domain/program';
import { blockStatus, currentPosition, planWeek, planWeeks, type PlanSchedule, type PlanWeek } from '../../domain/programCalendar';
import { counted } from '../../utils/counted';
import { WIDGET_TITLE_CLASS } from '../typography';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '../ui/hover-card';
import { cn } from '../ui/utils';
import { BLOCK_RULE, BLOCK_SOFT, BLOCK_SWATCH } from './blockColours';
import { BlockNumber } from './BlockNumber';
import { CheckInDot } from './CheckInDot';
import { dateRangeText } from './programView';
import { weekOfBlockShortText, weekOfBlockText, weekOfPlanText } from './weekView';

const ROW_MIN_REM = 48;
const ROW_CELL_MIN_REM = 3.5;
const PEEK_DATE = 'EEE d MMM';
const PEEK_OPEN_DELAY_MS = 150;
const PEEK_CLOSE_DELAY_MS = 200;

export type TimelineWeekAction =
  | { kind: 'select'; label: string; onSelect: (weekOfPlan: number) => void }
  | { kind: 'link'; label: string; hrefOf: (weekOfPlan: number) => string };

type PlanTimelineProps = PlanSchedule & {
  preferredWeekday: Weekday;
  weekAction: TimelineWeekAction;
  shownWeek?: number;
};

type TimelineWeek = PlanWeek & {
  totalWeeks: number;
  block: Block;
  range: { start: Date; end: Date } | null;
  checkIn: Date | null;
};

type Layout = 'row' | 'stacked';
type WeekMark = 'now' | 'shown' | 'peeked';
type CellFocus = 'tab-stop' | 'roving';

function timelineWeeks({ blocks, dayOne }: Pick<PlanSchedule, 'blocks' | 'dayOne'>, preferredWeekday: Weekday): TimelineWeek[][] {
  const totalWeeks = planWeeks(blocks);
  const weeks = Array.from({ length: totalWeeks }, (_, offset): TimelineWeek => {
    const week = planWeek({ blocks, dayOne }, offset + 1, preferredWeekday);
    const start = week.days[0].date;
    const end = week.days[week.days.length - 1].date;
    return {
      ...week,
      totalWeeks,
      block: blocks[week.blockIndex],
      range: start && end ? { start, end } : null,
      checkIn: week.days.find(day => day.checkIn)?.date ?? null,
    };
  });
  return blocks.map((_, blockIndex) => weeks.filter(week => week.blockIndex === blockIndex));
}

function spokenWeek(week: TimelineWeek, marks: ReadonlySet<WeekMark>): string {
  return [
    weekOfPlanText(week),
    ...(week.range ? [`${format(week.range.start, 'd MMM')} to ${format(week.range.end, 'd MMM')}`] : []),
    weekOfBlockText(week),
    ...(week.checkIn ? [`check-in form ${format(week.checkIn, PEEK_DATE)}`] : []),
    ...(marks.has('now') ? ['this week'] : []),
  ].join(', ');
}

function peekAfter(current: number | null, week: number, open: boolean): number | null {
  if (open) return week;
  return current === week ? null : current;
}

function useTimelineLayout(weeks: number): { ref: RefObject<HTMLDivElement>; layout: Layout } {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const rem = typeof document === 'undefined' ? 16 : parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const fitsRow = width >= ROW_MIN_REM * rem && width / weeks >= ROW_CELL_MIN_REM * rem;
  return { ref, layout: fitsRow ? 'row' : 'stacked' };
}

function TimelineWeekPeek({ week, marks }: { week: TimelineWeek; marks: ReadonlySet<WeekMark> }) {
  return (
    <div className="grid gap-2 text-sm text-text-primary">
      <p className="flex items-baseline justify-between gap-3">
        <span className={WIDGET_TITLE_CLASS}>{weekOfPlanText(week)}</span>
        {week.range && <span className="text-text-secondary tabular-nums">{dateRangeText(week.range.start, week.range.end)}</span>}
      </p>
      <p className="flex items-center gap-2">
        <BlockNumber block={week.block} index={week.blockIndex} size="xs" />
        {weekOfBlockShortText(week)}
      </p>
      {week.checkIn && (
        <p className="flex items-center gap-2">
          <CheckInDot />
          {`Check-in form ${format(week.checkIn, PEEK_DATE)}`}
        </p>
      )}
      {!isBlockWritten(week.block) && <p className="text-text-secondary">Not written yet</p>}
      {marks.has('shown') && <p className="pt-1 text-text-secondary">Shown in the week card</p>}
    </div>
  );
}

type WeekCellProps = {
  week: TimelineWeek;
  layout: Layout;
  marks: ReadonlySet<WeekMark>;
  focus: CellFocus;
  action: TimelineWeekAction;
  cellRef: (element: HTMLElement | null) => void;
  onFocus: () => void;
};

function WeekCell({ week, layout, marks, focus, action, cellRef, onFocus }: WeekCellProps) {
  const now = marks.has('now');
  const cellProps = {
    'data-week': week.weekOfPlan,
    'data-parity': 'plan-week',
    tabIndex: focus === 'tab-stop' ? 0 : -1,
    'aria-label': `${action.label}: ${spokenWeek(week, marks)}`,
    'aria-current': marks.has('shown') ? ('true' as const) : undefined,
    onFocus,
    className: cn('relative hit-area flex w-full rounded-field border border-control-border-soft text-text-primary tabular-nums', BLOCK_SOFT[week.block.type], {
      'h-13 flex-col justify-between p-2 text-left': layout === 'row',
      'h-12 flex-col items-center justify-center gap-1': layout === 'stacked',
      'border-surface-inverted bg-surface-inverted text-surface-inverted-foreground': now,
      'aria-[current=true]:selected-cell': !now,
      'border-dashed border-text-primary': marks.has('peeked') && !now,
    }),
  };
  const face: ReactNode = (
    <>
      <span aria-hidden="true" className={cn('flex items-baseline font-medium', { 'gap-1.5 text-base': layout === 'row', 'flex-col items-center text-sm leading-none': layout === 'stacked' })}>
        {week.weekOfPlan}
        {now && <span className={cn('text-xs', { 'mt-1': layout === 'stacked' })}>Now</span>}
      </span>
      {week.checkIn && (
        <span aria-hidden="true" className="flex items-center gap-1 text-xs font-medium">
          <CheckInDot />
          {layout === 'row' && format(week.checkIn, 'd MMM')}
        </span>
      )}
    </>
  );
  if (action.kind === 'link') {
    return (
      <HoverCardTrigger asChild>
        <Link ref={cellRef} to={action.hrefOf(week.weekOfPlan)} {...cellProps}>
          {face}
        </Link>
      </HoverCardTrigger>
    );
  }
  return (
    <HoverCardTrigger asChild>
      <button ref={cellRef} type="button" onClick={() => action.onSelect(week.weekOfPlan)} {...cellProps}>
        {face}
      </button>
    </HoverCardTrigger>
  );
}

function BlockHead({ block, index, weeks, layout }: { block: Block; index: number; weeks: readonly TimelineWeek[]; layout: Layout }) {
  const first = weeks[0].range;
  const last = weeks[weeks.length - 1].range;
  return (
    <div className={cn('@container flex items-center gap-2 pb-2', { [cn('border-t-3 pt-2', BLOCK_RULE[block.type])]: layout === 'row' })}>
      <BlockNumber block={block} index={index} size="xs" />
      <span className={cn('min-w-0 font-semibold text-text-primary', { 'text-sm': layout === 'row', 'text-base': layout === 'stacked' })}>{BLOCK_TYPE_LABELS[block.type]}</span>
      <span className="ml-auto text-right text-sm whitespace-nowrap text-text-secondary tabular-nums">
        <span className="@max-[9rem]:hidden">{counted(block.weeks, 'week')}</span>
        {first && last && <span className="@max-[15rem]:hidden">{` · ${dateRangeText(first.start, last.end)}`}</span>}
      </span>
    </div>
  );
}

function stepFrom(key: string, week: number, total: number): number | null {
  if (key === 'ArrowRight') return Math.min(week + 1, total);
  if (key === 'ArrowLeft') return Math.max(week - 1, 1);
  if (key === 'Home') return 1;
  return key === 'End' ? total : null;
}

function marksOf(weekOfPlan: number, current: { now: number | null; shown?: number; peeked: number | null }): ReadonlySet<WeekMark> {
  const marks = new Set<WeekMark>();
  if (current.now === weekOfPlan) marks.add('now');
  if (current.shown === weekOfPlan) marks.add('shown');
  if (current.peeked === weekOfPlan) marks.add('peeked');
  return marks;
}

export function PlanTimeline({ blocks, dayOne, preferredWeekday, today, shownWeek, weekAction }: PlanTimelineProps) {
  const byBlock = timelineWeeks({ blocks, dayOne }, preferredWeekday);
  const totalWeeks = planWeeks(blocks);
  const position = currentPosition(blocks, dayOne, today);
  const nowWeek = position.status === 'in-plan' ? position.weekOfPlan : null;
  const { ref, layout } = useTimelineLayout(totalWeeks);
  const [peekWeek, setPeekWeek] = useState<number | null>(null);
  const [tabWeek, setTabWeek] = useState(shownWeek ?? nowWeek ?? 1);
  const cells = useRef(new Map<number, HTMLElement>());

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const week = Number((event.target as HTMLElement).dataset.week);
    if (!week) return;
    const next = stepFrom(event.key, week, totalWeeks);
    if (next === null) return;
    event.preventDefault();
    cells.current.get(next)?.focus();
  }

  return (
    <div ref={ref} data-parity="plan-timeline" className="grid gap-3">
      <div role="toolbar" aria-label="Plan weeks" onKeyDown={onKeyDown}>
        <ol aria-label="Plan blocks" className={cn({ 'flex gap-1': layout === 'row', 'grid gap-4': layout === 'stacked' })}>
          {byBlock.map((weeks, index) => {
            const block = blocks[index];
            return (
              <li
                key={block.id}
                data-parity="plan-block"
                aria-current={blockStatus({ blocks, dayOne, today }, index).kind === 'current' ? 'step' : undefined}
                className="min-w-0"
                style={layout === 'row' ? { flexGrow: block.weeks, flexBasis: 0 } : undefined}
              >
                <BlockHead block={block} index={index} weeks={weeks} layout={layout} />
                <ol
                  aria-label={`${BLOCK_TYPE_LABELS[block.type]} weeks`}
                  className={cn('grid gap-1', { 'grid-cols-[repeat(auto-fill,minmax(3rem,1fr))]': layout === 'stacked' })}
                  style={layout === 'row' ? { gridTemplateColumns: `repeat(${block.weeks}, minmax(0, 1fr))` } : undefined}
                >
                  {weeks.map(week => {
                    const marks = marksOf(week.weekOfPlan, { now: nowWeek, shown: shownWeek, peeked: peekWeek });
                    return (
                      <li key={week.weekOfPlan}>
                        <HoverCard
                          open={marks.has('peeked')}
                          openDelay={PEEK_OPEN_DELAY_MS}
                          closeDelay={PEEK_CLOSE_DELAY_MS}
                          onOpenChange={open => setPeekWeek(current => peekAfter(current, week.weekOfPlan, open))}
                        >
                          <WeekCell
                            week={week}
                            layout={layout}
                            marks={marks}
                            focus={tabWeek === week.weekOfPlan ? 'tab-stop' : 'roving'}
                            action={weekAction}
                            cellRef={element => {
                              if (element) cells.current.set(week.weekOfPlan, element);
                              else cells.current.delete(week.weekOfPlan);
                            }}
                            onFocus={() => setTabWeek(week.weekOfPlan)}
                          />
                          <HoverCardContent
                            side="bottom"
                            align="center"
                            collisionPadding={16}
                            aria-hidden="true"
                            data-parity="plan-week-peek"
                            className="w-62 rounded-card p-4 motion-reduce:animate-none"
                          >
                            <TimelineWeekPeek week={week} marks={marks} />
                          </HoverCardContent>
                        </HoverCard>
                      </li>
                    );
                  })}
                </ol>
              </li>
            );
          })}
        </ol>
      </div>
      {dayOne && (
        <p className="flex items-center gap-2 text-sm text-text-secondary">
          <CheckInDot />
          Check-in form day, every two weeks
        </p>
      )}
    </div>
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
