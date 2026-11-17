import { format } from 'date-fns';
import { cva, type VariantProps } from 'class-variance-authority';
import { Dumbbell, Footprints, Moon, type LucideIcon } from 'lucide-react';
import { weekdayAbbreviation } from '../../domain/program';
import { EYEBROW_CLASS } from '../typography';
import { cn } from '../ui/utils';
import { CHECK_IN_DAY_LABEL } from './CheckInDayNote';
import { CheckInDot } from './CheckInDot';
import type { ExerciseLibrary } from './programView';
import { dayDateText, dayLengthOf, dayPlanName, type DayPlan, type WeekDay } from './weekView';

export type DayKind = DayPlan['kind'];

type DayCellVariant = NonNullable<VariantProps<typeof dayCellVariants>['variant']>;

/**
 * `agenda` is one day of the printed week: a row on a phone, and from `sm` a column of the week's
 * subgrid whose tile is a `DayTile` and whose caption sits under it.
 */
export const dayCellVariants = cva('group/day relative grid w-full min-w-0 border', {
  variants: {
    kind: {
      session: 'border-control-border-soft bg-surface-base',
      cardio: 'border-training-recovery bg-training-recovery-soft text-training-recovery-ink',
      rest: 'border-control-border-soft bg-surface-subtle',
    },
    variant: {
      rail: cn(
        'min-h-16 content-center justify-items-center gap-0.5 px-0.5 py-1.5 text-center',
        '@3xl:min-h-30 @3xl:grid-rows-[auto_1fr_auto] @3xl:content-stretch @3xl:justify-items-start @3xl:gap-1.5 @3xl:rounded-control @3xl:px-2 @3xl:py-3 @3xl:text-left @4xl:px-3',
      ),
      card: 'min-h-30 grid-rows-[auto_1fr_auto] justify-items-start gap-1.5 rounded-control p-3 text-left',
      agenda: cn(
        'min-h-13 grid-cols-[2.75rem_1.25rem_minmax(0,1fr)_auto] items-center gap-x-2.5 rounded-control px-3 py-1.5 text-left',
        'sm:row-span-3 sm:min-h-0 sm:grid-cols-1 sm:grid-rows-subgrid sm:items-start sm:gap-x-0 sm:border-0 sm:bg-transparent sm:p-0',
      ),
      tile: 'aspect-square grid-cols-[minmax(0,1fr)_auto] content-between items-end rounded-control p-(--tile-inset) text-left [--tile-inset:1.8mm]',
    },
  },
  compoundVariants: [
    { variant: ['rail', 'card'], kind: 'session', class: 'hover:bg-surface-subtle' },
    { variant: ['rail', 'card'], kind: 'cardio', class: 'hover:border-training-recovery-ink' },
    { variant: ['rail', 'card'], kind: 'rest', class: 'hover:bg-surface-muted' },
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
  rest: 'text-text-secondary',
};

export const KIND_NAME_CLASS: Record<DayKind, string> = {
  session: 'text-text-primary',
  cardio: cn('text-training-recovery-ink', SELECTED_INK),
  rest: 'text-text-secondary',
};

const DATE_INK: Record<DayKind, string> = {
  session: 'text-text-primary @3xl:text-text-secondary',
  cardio: 'text-text-primary @3xl:text-training-recovery-ink @3xl:group-data-[state=active]/day:text-text-primary',
  rest: 'text-text-secondary',
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

type DayCellProps = { day: WeekDay; exercisesById: ExerciseLibrary; variant: Extract<DayCellVariant, 'rail' | 'card'> };

/** The face of a day in the viewer's week rail (`rail`) or the builder's week (`card`). */
export function DayCell({ day, exercisesById, variant }: DayCellProps) {
  const { kind } = day.plan;
  const Glyph = KIND_ICON[kind];
  const compact = variant === 'rail';
  const length = dayLengthOf(day.plan, exercisesById)?.shown;
  return (
    <>
      <span aria-hidden={compact || undefined} className="contents">
        <span aria-hidden="true" className={cn('flex items-center', { 'flex-col gap-0.5 @3xl:flex-row @3xl:gap-1.5': compact, 'pr-8': !compact })}>
          <span className={cn(WEEKDAY_CLASS, { [EYEBROW_CLASS]: !compact, '@3xl:text-label @3xl:uppercase': compact }, KIND_META_CLASS[kind])}>
            {weekdayAbbreviation(day.weekday)}
          </span>
          {compact && day.date && <DateMark date={day.date} isToday={day.isToday} kind={kind} />}
        </span>
        <span className={cn('grid content-start gap-1 self-start', { 'hidden @3xl:grid': compact })}>
          <span className={cn('line-clamp-2 text-sm font-medium text-balance break-words', KIND_NAME_CLASS[kind])}>{dayPlanName(day.plan)}</span>
          {day.checkIn && <CheckInLabel />}
        </span>
        <span className="flex items-center gap-1.5 self-end">
          <Glyph aria-hidden="true" strokeWidth={KIND_GLYPH_STROKE[kind]} className={cn('size-4 shrink-0', KIND_GLYPH_CLASS[kind])} />
          {length && !compact && <span aria-hidden="true" className={cn('text-sm tabular-nums', KIND_META_CLASS[kind])}>{length}</span>}
        </span>
        {compact && day.checkIn && <CheckInDot className="absolute top-1.5 right-1.5 @3xl:hidden" />}
      </span>
      {compact && <span className="sr-only">{spokenRailDay(day)}</span>}
    </>
  );
}
