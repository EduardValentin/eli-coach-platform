import type { BuilderWeekDates } from '../../services/programWriteService';
import { format } from 'date-fns';
import { Fragment, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import { Link } from 'react-router';
import { isBlockWritten, WEEKDAY_LABELS, type Block, type Weekday } from '../../domain/program';
import { blockStatus, currentPosition, planWeek, planWeeks, weekRangeOf, type DateRange, type PlanSchedule, type PlanWeek } from '../../domain/programCalendar';
import { useContainerWidthRem } from '../../hooks/useContainerWidthRem';
import { counted } from '../../utils/counted';
import { WIDGET_TITLE_CLASS } from '../typography';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '../ui/hover-card';
import { cn } from '../ui/utils';
import { BLOCK_RULE, BLOCK_SOFT, BLOCK_SWATCH } from './blockColours';
import { BlockNumber } from './BlockNumber';
import { CHECK_IN_DAY_LABEL } from './CheckInDayNote';
import { CheckInDot } from './CheckInDot';
import { dateRangeText, spokenRangeText } from './programView';
import { blockName, weekOfBlockText, weekOfPlanText } from './weekView';

const ROW_CELL_MIN_REM = 3.5;
const PEEK_DATE = 'EEE d MMM';
const CELL_DATE = 'd MMM';
const NO_DATE = '\u00a0';
const PEEK_OPEN_DELAY_MS = 150;
const PEEK_CLOSE_DELAY_MS = 200;

/**
 * `open-block` is the builder's plan: every week is dated by its start, from today until day 1 is set, and named week first
 * ("Week 1 of 11, Foundation week 1 of 4, …, open block"); the other interactive kinds lead with their label.
 */
export type TimelineWeekAction =
  | { kind: 'select'; label: string; onSelect: (weekOfPlan: number) => void }
  | { kind: 'link'; label: string; hrefOf: (weekOfPlan: number) => string }
  | { kind: 'open-block'; onOpen: (blockIndex: number) => void; dates?: BuilderWeekDates }
  | { kind: 'anchor'; hrefOf: (weekOfPlan: number) => string | null }
  | { kind: 'none' };

type InteractiveWeekAction = Extract<TimelineWeekAction, { kind: 'select' | 'link' | 'open-block' }>;
type StaticWeekAction = Extract<TimelineWeekAction, { kind: 'anchor' | 'none' }>;

type PlanTimelineProps = PlanSchedule & {
  preferredWeekday: Weekday;
  weekAction: TimelineWeekAction;
  shownWeek?: number;
};

type TimelineWeek = PlanWeek & {
  totalWeeks: number;
  block: Block;
  range: DateRange | null;
  checkIn: Date | null;
};

type Layout = 'row' | 'stacked';
type WeekDate = 'check-in' | 'start';
/** A static timeline reads as a calendar, every week dated by its start; an interactive one dates only its check-in weeks. */
type CellLook = { face: Layout; date: WeekDate };
type HeadMeta = 'beside' | 'below';
type WeekMark = 'now' | 'shown' | 'peeked';
type CellFocus = 'tab-stop' | 'roving';

function timelineWeeks({ blocks, dayOne }: Pick<PlanSchedule, 'blocks' | 'dayOne'>, preferredWeekday: Weekday): TimelineWeek[][] {
  const totalWeeks = planWeeks(blocks);
  const weeks = Array.from({ length: totalWeeks }, (_, offset): TimelineWeek => {
    const week = planWeek({ blocks, dayOne }, offset + 1, preferredWeekday);
    return {
      ...week,
      totalWeeks,
      block: blocks[week.blockIndex],
      range: weekRangeOf(week.days),
      checkIn: week.days.find(day => day.checkIn)?.date ?? null,
    };
  });
  return blocks.map((_, blockIndex) => weeks.filter(week => week.blockIndex === blockIndex));
}

function weekFirstBlockText(week: TimelineWeek): string {
  const name = blockName(week.block);
  return week.block.weeks === 1 ? name : `${name} week ${week.weekOfBlock} of ${week.block.weeks}`;
}

type WeekNaming = 'action-first' | 'week-first';

function spokenWeek(week: TimelineWeek, marks: ReadonlySet<WeekMark>, naming: WeekNaming = 'action-first'): string {
  const ofBlock = naming === 'week-first' ? weekFirstBlockText(week) : weekOfBlockText(week, 'long');
  return [
    weekOfPlanText(week),
    ...(week.range ? [spokenRangeText(week.range)] : []),
    ofBlock,
    ...(week.checkIn ? [`check-in form ${format(week.checkIn, PEEK_DATE)}`] : []),
    ...(marks.has('now') ? ['this week'] : []),
  ].join(', ');
}

function peekAfter(current: number | null, week: number, open: boolean): number | null {
  if (open) return week;
  return current === week ? null : current;
}

function useTimelineLayout(weeks: number): { ref: RefObject<HTMLDivElement>; layout: Layout } {
  const { ref, widthRem } = useContainerWidthRem<HTMLDivElement>();
  const fitsRow = widthRem > 0 && widthRem / weeks >= ROW_CELL_MIN_REM;
  return { ref, layout: fitsRow ? 'row' : 'stacked' };
}

function TimelineWeekPeek({ week, marks }: { week: TimelineWeek; marks: ReadonlySet<WeekMark> }) {
  return (
    <div className="grid gap-2 text-sm text-text-primary">
      <p className="flex items-baseline justify-between gap-3">
        <span className={WIDGET_TITLE_CLASS}>{weekOfPlanText(week)}</span>
        {week.range && <span className="text-text-secondary tabular-nums">{dateRangeText(week.range)}</span>}
      </p>
      <p className="flex items-center gap-2">
        <BlockNumber block={week.block} index={week.blockIndex} size="xs" />
        {weekOfBlockText(week, 'short')}
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

function weekCellClass(week: TimelineWeek, { face }: CellLook, marks: ReadonlySet<WeekMark>): string {
  const now = marks.has('now');
  return cn('relative flex w-full rounded-field border border-control-border-soft text-text-primary tabular-nums', BLOCK_SOFT[week.block.type], {
    'min-h-13 flex-col justify-between px-1.5 py-2 text-left': face === 'row',
    'min-h-12 flex-col items-center justify-center gap-1': face === 'stacked',
    'border-surface-inverted bg-surface-inverted text-surface-inverted-foreground': now,
    'aria-[current=true]:selected-cell': !now,
    'border-dashed border-text-primary': marks.has('peeked') && !now,
  });
}

function datedOn(week: TimelineWeek, date: WeekDate): Date | null {
  return date === 'start' ? (week.range?.start ?? null) : week.checkIn;
}

/** Every row cell keeps its date line, blank or not, so the cells of a row stay one height. */
function WeekCorner({ week, date }: { week: TimelineWeek; date: WeekDate }) {
  const shown = datedOn(week, date);
  return (
    <>
      {week.checkIn && <CheckInDot className="absolute top-2 right-1.5" />}
      <span aria-hidden="true" data-parity="plan-week-date" className="text-caption font-medium whitespace-nowrap">
        {shown ? format(shown, CELL_DATE) : NO_DATE}
      </span>
    </>
  );
}

function WeekFace({ week, look, marks }: { week: TimelineWeek; look: CellLook; marks: ReadonlySet<WeekMark> }) {
  const now = marks.has('now');
  const layout = look.face;
  return (
    <>
      <span aria-hidden="true" data-parity="plan-week-number" className={cn('flex items-baseline font-medium', { 'gap-1.5 text-base': layout === 'row', 'flex-col items-center text-sm leading-none': layout === 'stacked' })}>
        {week.weekOfPlan}
        {now && <span className={cn('text-xs', { 'mt-1': layout === 'stacked' })}>Now</span>}
      </span>
      {week.checkIn && layout === 'stacked' && (
        <span aria-hidden="true" className="flex items-center">
          <CheckInDot />
        </span>
      )}
      {layout === 'row' && <WeekCorner week={week} date={look.date} />}
    </>
  );
}

const NO_MARKS: ReadonlySet<WeekMark> = new Set();

function StaticWeekCell({ week, look, action }: { week: TimelineWeek; look: CellLook; action: StaticWeekAction }) {
  const href = action.kind === 'anchor' ? action.hrefOf(week.weekOfPlan) : null;
  const content = (
    <>
      <WeekFace week={week} look={look} marks={NO_MARKS} />
      <span className="sr-only">{spokenWeek(week, NO_MARKS)}</span>
    </>
  );
  if (href) {
    return (
      <a href={href} data-parity="plan-week" className={cn('hit-area hover:border-text-primary', weekCellClass(week, look, NO_MARKS))}>
        {content}
      </a>
    );
  }
  return (
    <div data-parity="plan-week" className={cn(weekCellClass(week, look, NO_MARKS), { 'bg-surface-subtle text-text-secondary': action.kind === 'anchor' })}>
      {content}
    </div>
  );
}

type WeekCellProps = {
  week: TimelineWeek;
  look: CellLook;
  marks: ReadonlySet<WeekMark>;
  focus: CellFocus;
  action: InteractiveWeekAction;
  cellRef: (element: HTMLElement | null) => void;
  onFocus: () => void;
};

function weekCellName(week: TimelineWeek, marks: ReadonlySet<WeekMark>, action: InteractiveWeekAction): string {
  if (action.kind === 'open-block') return `${spokenWeek(week, marks, 'week-first')}, open block`;
  return `${action.label}: ${spokenWeek(week, marks)}`;
}

function chooseWeek(week: TimelineWeek, action: Exclude<InteractiveWeekAction, { kind: 'link' }>) {
  if (action.kind === 'open-block') action.onOpen(week.blockIndex);
  else action.onSelect(week.weekOfPlan);
}

function WeekCell({ week, look, marks, focus, action, cellRef, onFocus }: WeekCellProps) {
  const cellProps = {
    'data-week': week.weekOfPlan,
    'data-parity': 'plan-week',
    tabIndex: focus === 'tab-stop' ? 0 : -1,
    'aria-label': weekCellName(week, marks, action),
    'aria-current': marks.has('shown') ? ('true' as const) : undefined,
    onFocus,
    className: cn('hit-area', weekCellClass(week, look, marks)),
  };
  const face = <WeekFace week={week} look={look} marks={marks} />;
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
      <button ref={cellRef} type="button" onClick={() => chooseWeek(week, action)} {...cellProps}>
        {face}
      </button>
    </HoverCardTrigger>
  );
}

type BlockHeadProps = { block: Block; index: number; weeks: readonly TimelineWeek[]; layout: Layout; meta: HeadMeta };

function BlockHead({ block, index, weeks, layout, meta }: BlockHeadProps) {
  const first = weeks[0].range;
  const last = weeks[weeks.length - 1].range;
  const range = first && last ? dateRangeText({ start: first.start, end: last.end }) : null;
  const span = [...(block.weeks > 1 ? [counted(block.weeks, 'week')] : []), ...(range ? [range] : [])];
  return (
    <div data-parity="plan-block-head" className={cn('flex flex-wrap items-center gap-x-2 gap-y-0.5 pb-2', { [cn('border-t-3 pt-2', BLOCK_RULE[block.type])]: layout === 'row' })}>
      <span className="flex min-w-0 items-center gap-2 whitespace-nowrap">
        <BlockNumber block={block} index={index} size="xs" />
        <span className={cn('min-w-0 font-semibold text-text-primary', { 'text-sm': layout === 'row', 'text-base': layout === 'stacked' })}>{blockName(block)}</span>
      </span>
      {span.length > 0 && (
        <span data-parity="plan-block-span" className={cn('text-sm text-text-secondary tabular-nums', { 'basis-full': meta === 'below', 'ml-auto text-right': meta === 'beside' })}>
          {span.map((part, partIndex) => (
            <Fragment key={part}>
              {partIndex > 0 && ' · '}
              <span className="whitespace-nowrap">{part}</span>
            </Fragment>
          ))}
        </span>
      )}
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

type TimelineBlocksProps = {
  blocks: readonly Block[];
  byBlock: readonly TimelineWeek[][];
  layout: Layout;
  look: CellLook;
  currentBlock: number | null;
  renderWeek: (week: TimelineWeek) => ReactNode;
};

function TimelineBlocks({ blocks, byBlock, layout, look, currentBlock, renderWeek }: TimelineBlocksProps) {
  const meta: HeadMeta = layout === 'row' || look.date === 'start' ? 'below' : 'beside';
  return (
    <ol aria-label="Plan blocks" className={cn({ 'flex gap-1': layout === 'row', 'grid gap-4': layout === 'stacked' })}>
      {byBlock.map((weeks, index) => {
        const block = blocks[index];
        return (
          <li
            key={block.id}
            data-parity="plan-block"
            aria-current={currentBlock === index ? 'step' : undefined}
            className={cn({ 'min-w-0': meta === 'beside', 'flex flex-col': layout === 'row' })}
            style={layout === 'row' ? { flexGrow: block.weeks, flexBasis: 0 } : undefined}
          >
            <BlockHead block={block} index={index} weeks={weeks} layout={layout} meta={meta} />
            <ol
              aria-label={`${blockName(block)} weeks`}
              className={cn('grid gap-1', {
                'grid-cols-[repeat(auto-fill,minmax(3rem,1fr))]': layout === 'stacked' && look.face === 'stacked',
                'grid-cols-[repeat(auto-fill,minmax(3.5rem,1fr))] gap-1.5': layout === 'stacked' && look.face === 'row',
                'mt-auto': layout === 'row',
              })}
              style={layout === 'row' ? { gridTemplateColumns: `repeat(${block.weeks}, minmax(0, 1fr))` } : undefined}
            >
              {weeks.map(week => (
                <li key={week.weekOfPlan} data-parity="plan-week-item" className="grid">
                  {renderWeek(week)}
                </li>
              ))}
            </ol>
          </li>
        );
      })}
    </ol>
  );
}

function CheckInKey({ weekday }: { weekday: Weekday | null }) {
  const cadence = `${CHECK_IN_DAY_LABEL}, every two weeks`;
  return (
    <p className="flex items-center gap-2 text-sm text-text-secondary">
      <CheckInDot />
      {weekday ? `${cadence}, on ${WEEKDAY_LABELS[weekday]}s` : cadence}
    </p>
  );
}

const DATED_LOOK: CellLook = { face: 'row', date: 'start' };

/** The builder's plan dates its weeks from today until day 1 is set, without marking any week as now. */
function datedFrom({ dayOne, today, weekAction }: Pick<PlanTimelineProps, 'dayOne' | 'today' | 'weekAction'>): Date | null {
  return weekAction.kind === 'open-block' && weekAction.dates !== 'undated' ? (dayOne ?? today) : dayOne;
}

export function PlanTimeline(props: PlanTimelineProps) {
  const { blocks, preferredWeekday, weekAction } = props;
  const byBlock = timelineWeeks({ blocks, dayOne: datedFrom(props) }, preferredWeekday);
  const { ref, layout } = useTimelineLayout(planWeeks(blocks));
  if (weekAction.kind === 'none' || weekAction.kind === 'anchor') {
    const look = DATED_LOOK;
    return (
      <div ref={ref} data-parity="plan-timeline" className="grid gap-3">
        <TimelineBlocks
          blocks={blocks}
          byBlock={byBlock}
          layout={layout}
          look={look}
          currentBlock={null}
          renderWeek={week => <StaticWeekCell week={week} look={look} action={weekAction} />}
        />
        {props.dayOne && <CheckInKey weekday={preferredWeekday} />}
      </div>
    );
  }
  return <InteractiveTimeline {...props} weekAction={weekAction} byBlock={byBlock} layout={layout} timelineRef={ref} />;
}

type InteractiveTimelineProps = PlanTimelineProps & {
  weekAction: InteractiveWeekAction;
  byBlock: readonly TimelineWeek[][];
  layout: Layout;
  timelineRef: RefObject<HTMLDivElement>;
};

function InteractiveTimeline({ blocks, dayOne, today, preferredWeekday, shownWeek, weekAction, byBlock, layout, timelineRef }: InteractiveTimelineProps) {
  const opensBlocks = weekAction.kind === 'open-block';
  const look: CellLook = opensBlocks ? DATED_LOOK : { face: layout, date: 'check-in' };
  const totalWeeks = planWeeks(blocks);
  const position = currentPosition(blocks, dayOne, today);
  const nowWeek = position.status === 'in-plan' ? position.weekOfPlan : null;
  const currentBlock = blocks.findIndex((_, index) => blockStatus({ blocks, dayOne, today }, index).kind === 'current');
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

  function renderWeek(week: TimelineWeek) {
    const marks = marksOf(week.weekOfPlan, { now: nowWeek, shown: shownWeek, peeked: peekWeek });
    return (
      <HoverCard
        open={marks.has('peeked')}
        openDelay={PEEK_OPEN_DELAY_MS}
        closeDelay={PEEK_CLOSE_DELAY_MS}
        onOpenChange={open => setPeekWeek(current => peekAfter(current, week.weekOfPlan, open))}
      >
        <WeekCell
          week={week}
          look={look}
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
    );
  }

  return (
    <div ref={timelineRef} data-parity="plan-timeline" className="grid gap-3">
      <div role="toolbar" aria-label="Plan weeks" onKeyDown={onKeyDown}>
        <TimelineBlocks blocks={blocks} byBlock={byBlock} layout={layout} look={look} currentBlock={currentBlock === -1 ? null : currentBlock} renderWeek={renderWeek} />
      </div>
      {datedFrom({ dayOne, today, weekAction }) && <CheckInKey weekday={opensBlocks ? preferredWeekday : null} />}
    </div>
  );
}

type PlanStripProps = { blocks: readonly Block[]; dayOne: Date | null; today?: Date };

export function PlanStrip({ blocks, dayOne, today }: PlanStripProps) {
  const schedule = today ? { blocks, dayOne, today } : null;
  return (
    <span aria-hidden="true" data-parity="plan-strip" className="flex h-1.5 gap-0.5">
      {blocks.map((block, index) => (
        <span
          key={block.id}
          data-parity="plan-strip-segment"
          className={cn('rounded-full', BLOCK_SWATCH[block.type], {
            'opacity-40': schedule !== null && blockStatus(schedule, index).kind === 'ended',
          })}
          style={{ flexGrow: block.weeks, flexBasis: 0 }}
        />
      ))}
    </span>
  );
}
