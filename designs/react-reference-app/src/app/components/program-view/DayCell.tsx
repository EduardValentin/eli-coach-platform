import { format } from 'date-fns';
import { cva } from 'class-variance-authority';
import { Dumbbell, Footprints, Moon, type LucideIcon } from 'lucide-react';
import { weekdayAbbreviation } from '../../domain/program';
import { cn } from '../ui/utils';
import { CHECK_IN_DAY_LABEL } from './CheckInDayNote';
import { CheckInDot } from './CheckInDot';
import type { ExerciseLibrary } from './programView';
import { dayDateText, dayLengthOf, dayPlanName, type DayPlan, type WeekDay } from './weekView';

export type DayKind = DayPlan['kind'];

/**
 * `compact` is the builder's day card: its weekday and options on a top line over a `DayFace`.
 * `agenda` is one day of the printed week: a row on a phone, and from `sm` a column of the week's
 * subgrid whose tile is a `DayTile` and whose caption sits under it.
 */
export const dayCellVariants = cva('group/day relative grid w-full min-w-0 border', {
  variants: {
    kind: {
      session: 'border-control-border-soft bg-surface-base',
      cardio: 'border-training-recovery bg-training-recovery-soft text-training-recovery-ink',
      rest: 'border-control-border-soft bg-surface-neutral',
    },
    variant: {
      rail: cn(
        'min-h-16 content-center justify-items-center gap-0.5 px-0.5 py-1.5 text-center',
        '@3xl:min-h-30 @3xl:grid-rows-[auto_1fr_auto] @3xl:content-stretch @3xl:justify-items-start @3xl:gap-1.5 @3xl:rounded-control @3xl:px-2 @3xl:py-3 @3xl:text-left @4xl:px-3',
      ),
      compact: 'h-full grid-cols-[minmax(0,1fr)_auto] grid-rows-[auto_1fr] justify-items-start gap-x-1.5 gap-y-5 rounded-control px-2.5 py-2 text-left',
      agenda: cn(
        'min-h-13 grid-cols-[2.75rem_1.25rem_minmax(0,1fr)_auto] items-center gap-x-2.5 rounded-control px-3 py-1.5 text-left',
        'sm:row-span-3 sm:min-h-0 sm:grid-cols-1 sm:grid-rows-subgrid sm:items-start sm:gap-x-0 sm:border-0 sm:bg-transparent sm:p-0',
      ),
      tile: 'aspect-square grid-cols-[minmax(0,1fr)_auto] content-between items-end rounded-control p-(--tile-inset) text-left [--tile-inset:1.8mm]',
    },
  },
  compoundVariants: [
    { variant: ['rail', 'compact'], kind: 'session', class: 'hover:bg-surface-subtle' },
    { variant: ['rail', 'compact'], kind: 'cardio', class: 'hover:border-training-recovery-ink' },
    { variant: 'rail', kind: 'rest', class: 'enabled:hover:bg-surface-muted-hover' },
    { variant: 'compact', kind: 'rest', class: 'hover:bg-surface-muted-hover' },
    { variant: ['agenda', 'tile'], kind: 'rest', class: 'border-transparent' },
  ],
});

export const KIND_ICON: Record<DayKind, LucideIcon> = { session: Dumbbell, cardio: Footprints, rest: Moon };

export const KIND_GLYPH_STROKE: Record<DayKind, number> = { session: 2.5, cardio: 2, rest: 1.5 };

export const KIND_GLYPH_CLASS: Record<DayKind, string> = {
  session: 'text-text-primary',
  cardio: 'text-training-recovery',
  rest: 'text-text-secondary',
};

const WEEKDAY_CLASS = 'text-xs font-medium';

const SELECTED_INK = 'group-data-[state=active]/day:text-text-primary';

export const KIND_META_CLASS: Record<DayKind, string> = {
  session: 'text-text-secondary',
  cardio: cn('text-training-recovery-ink', SELECTED_INK),
  rest: 'text-neutral-ink',
};

export const KIND_NAME_CLASS: Record<DayKind, string> = {
  session: 'text-text-primary',
  cardio: cn('text-training-recovery-ink', SELECTED_INK),
  rest: 'text-neutral-ink',
};

const DATE_INK: Record<DayKind, string> = {
  session: 'text-text-primary @3xl:text-text-secondary',
  cardio: 'text-text-primary @3xl:text-training-recovery-ink @3xl:group-data-[state=active]/day:text-text-primary',
  rest: 'text-neutral-ink',
};

const TODAY_DATE_INK: Record<DayKind, string> = {
  session: 'text-text-primary @3xl:text-text-primary',
  cardio: 'text-text-primary @3xl:text-training-recovery-ink @3xl:group-data-[state=active]/day:text-text-primary',
  rest: 'text-text-primary @3xl:text-text-primary',
};

export function CheckInLabel({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium text-text-primary', className)}>
      <CheckInDot />
      {CHECK_IN_DAY_LABEL}
    </span>
  );
}

function spokenRailDay(day: WeekDay): string {
  return [dayDateText(day), dayPlanName(day.plan), ...(day.isToday ? ['today'] : []), ...(day.checkIn ? [CHECK_IN_DAY_LABEL.toLowerCase()] : [])].join(', ');
}

function DateMark({ date, isToday, kind }: { date: Date; isToday: boolean; kind: DayKind }) {
  return (
    <span
      className={cn(
        'inline-flex size-7 items-center justify-center rounded-full border-[1.5px] text-base leading-5 font-semibold tabular-nums @3xl:h-5 @3xl:w-auto @3xl:min-w-5 @3xl:px-0.5 @3xl:text-xs @3xl:leading-4 @3xl:font-medium',
        isToday ? cn('border-current @3xl:font-semibold', TODAY_DATE_INK[kind]) : cn('border-transparent', DATE_INK[kind]),
      )}
    >
      {format(date, 'd')}
    </span>
  );
}


function DayGlyph({ day }: { day: Pick<WeekDay, 'weekday' | 'plan'> }) {
  const { kind } = day.plan;
  const Glyph = KIND_ICON[kind];
  return <Glyph aria-hidden="true" strokeWidth={KIND_GLYPH_STROKE[kind]} className={cn('size-4 shrink-0', KIND_GLYPH_CLASS[kind])} data-parity={`day-glyph-${day.weekday}`} />;
}

const DAY_FACE_CLASS = 'col-span-full row-start-2 grid h-full content-between justify-items-start gap-1.5 text-left';

/** The pointer area spans the whole card, so a click anywhere on it opens the day; the card's own controls sit above it. */
const CARD_WIDE_BUTTON_CLASS =
  "cursor-pointer outline-none after:absolute after:inset-0 after:rounded-control after:content-[''] focus-visible:after:ring-[3px] focus-visible:after:ring-ring/50";

type DayFaceProps = { day: WeekDay; exercisesById: ExerciseLibrary; onOpen?: () => void };

/** The plan and its length under the top line of a `compact` card; with `onOpen` it is the card's one open control. */
export function DayFace({ day, exercisesById, onOpen }: DayFaceProps) {
  const { kind } = day.plan;
  const length = dayLengthOf(day.plan, exercisesById)?.shown;
  const face = (
    <>
      <span className={cn('line-clamp-2 text-sm font-medium text-balance break-words', KIND_NAME_CLASS[kind])} data-parity={`day-name-${day.weekday}`}>
        {dayPlanName(day.plan)}
      </span>
      <span className="flex items-center gap-1.5">
        <DayGlyph day={day} />
        {length && (
          <span aria-hidden="true" className={cn('text-sm tabular-nums', KIND_META_CLASS[kind])} data-parity={`day-length-${day.weekday}`}>
            {length}
          </span>
        )}
      </span>
    </>
  );
  const parity = `day-face-${day.weekday}`;
  if (!onOpen) return <div className={DAY_FACE_CLASS} data-parity={parity}>{face}</div>;
  return (
    <button type="button" onClick={onOpen} className={cn(DAY_FACE_CLASS, CARD_WIDE_BUTTON_CLASS)} data-parity={parity}>
      {face}
    </button>
  );
}

/** The face of a day in a week rail tab. */
export function DayCell({ day }: { day: WeekDay }) {
  const { kind } = day.plan;
  return (
    <>
      <span aria-hidden="true" className="contents">
        <span aria-hidden="true" className="flex flex-col items-center gap-0.5 @3xl:flex-row @3xl:gap-1.5">
          <span className={cn(WEEKDAY_CLASS, '@3xl:text-label @3xl:uppercase', KIND_META_CLASS[kind])}>{weekdayAbbreviation(day.weekday)}</span>
          {day.date && <DateMark date={day.date} isToday={day.isToday} kind={kind} />}
        </span>
        <span className="hidden content-start gap-1 self-start @3xl:grid">
          <span className={cn('line-clamp-2 text-sm font-medium text-balance break-words', KIND_NAME_CLASS[kind])}>{dayPlanName(day.plan)}</span>
          {day.checkIn && <CheckInLabel />}
        </span>
        <span className="flex items-center gap-1.5 self-end">
          <DayGlyph day={day} />
        </span>
        {day.checkIn && <CheckInDot className="absolute top-1.5 right-1.5 @3xl:hidden" />}
      </span>
      <span className="sr-only">{spokenRailDay(day)}</span>
    </>
  );
}
