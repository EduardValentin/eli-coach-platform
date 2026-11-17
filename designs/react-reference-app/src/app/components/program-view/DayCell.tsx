import { format } from 'date-fns';
import { cva, type VariantProps } from 'class-variance-authority';
import { Dumbbell, Footprints, Moon, type LucideIcon } from 'lucide-react';
import type { Exercise } from '../../context/TrainingContext';
import { WEEKDAY_LABELS, weekdayAbbreviation } from '../../domain/program';
import { EYEBROW_CLASS } from '../typography';
import { cn } from '../ui/utils';
import { CheckInDot } from './CheckInDot';
import { dayLengthText, dayPlanName, type DayPlan, type WeekDay } from './weekView';

type Library = ReadonlyMap<string, Exercise>;
type DayKind = DayPlan['kind'];

type DayCellVariant = NonNullable<VariantProps<typeof dayCellVariants>['variant']>;

export const dayCellVariants = cva('group/day relative grid w-full min-w-0 border', {
  variants: {
    kind: {
      session: 'border-control-border-soft bg-surface-base hover:bg-surface-subtle',
      cardio: 'border-training-recovery bg-training-recovery-soft text-training-recovery-ink hover:border-training-recovery-ink',
      rest: 'border-control-border-soft bg-surface-subtle hover:bg-surface-muted',
    },
    variant: {
      rail: cn(
        'min-h-16 content-center justify-items-center gap-0.5 px-0.5 py-1.5 text-center',
        '@3xl:min-h-30 @3xl:grid-rows-[auto_1fr_auto] @3xl:content-stretch @3xl:justify-items-start @3xl:gap-1.5 @3xl:rounded-control @3xl:px-2 @3xl:py-3 @3xl:text-left @4xl:px-3',
      ),
      card: 'min-h-30 grid-rows-[auto_1fr_auto] justify-items-start gap-1.5 rounded-control p-3 text-left',
    },
  },
});

const KIND_ICON: Record<DayKind, LucideIcon> = { session: Dumbbell, cardio: Footprints, rest: Moon };

const KIND_GLYPH_STROKE: Record<DayKind, number> = { session: 2.5, cardio: 2, rest: 1.5 };

const KIND_GLYPH_CLASS: Record<DayKind, string> = {
  session: 'text-text-primary',
  cardio: 'text-training-recovery',
  rest: 'text-text-secondary',
};

const SELECTED_INK = 'group-data-[state=active]/day:text-text-primary';

const KIND_META_CLASS: Record<DayKind, string> = {
  session: 'text-text-secondary',
  cardio: cn('text-training-recovery-ink', SELECTED_INK),
  rest: 'text-text-secondary',
};

const KIND_NAME_CLASS: Record<DayKind, string> = {
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

function spokenDayName(day: WeekDay): string {
  const date = day.date ? ` ${format(day.date, 'd MMMM')}` : '';
  return [`${WEEKDAY_LABELS[day.weekday]}${date}`, dayPlanName(day.plan), ...(day.isToday ? ['today'] : []), ...(day.checkIn ? ['check-in form due'] : [])].join(', ');
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

type DayCellProps = { day: WeekDay; exercisesById: Library; variant: DayCellVariant };

export function DayCell({ day, exercisesById, variant }: DayCellProps) {
  const { kind } = day.plan;
  const Glyph = KIND_ICON[kind];
  const compact = variant === 'rail';
  const length = dayLengthText(day.plan, exercisesById);
  return (
    <>
      <span aria-hidden={compact || undefined} className="contents">
        <span aria-hidden="true" className={cn('flex items-center', { 'flex-col gap-0.5 @3xl:flex-row @3xl:gap-1.5': compact, 'pr-8': !compact })}>
          <span className={cn('text-xs font-medium', KIND_META_CLASS[kind], { [EYEBROW_CLASS]: !compact, '@3xl:text-label @3xl:uppercase': compact })}>
            {weekdayAbbreviation(day.weekday)}
          </span>
          {compact && day.date && <DateMark date={day.date} isToday={day.isToday} kind={kind} />}
        </span>
        <span className={cn('grid content-start gap-1 self-start', { 'hidden @3xl:grid': compact })}>
          <span className={cn('line-clamp-2 text-sm font-medium text-balance break-words', KIND_NAME_CLASS[kind])}>{dayPlanName(day.plan)}</span>
          {day.checkIn && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-text-primary">
              <CheckInDot />
              Check-in form
            </span>
          )}
        </span>
        <span className="flex items-center gap-1.5 self-end">
          <Glyph aria-hidden="true" strokeWidth={KIND_GLYPH_STROKE[kind]} className={cn('size-4 shrink-0', KIND_GLYPH_CLASS[kind])} />
          {length && <span aria-hidden="true" className={cn('text-sm tabular-nums', KIND_META_CLASS[kind], { 'hidden @3xl:inline': compact })}>{length}</span>}
        </span>
        {compact && day.checkIn && <CheckInDot className="absolute top-1.5 right-1.5 @3xl:hidden" />}
      </span>
      {compact && <span className="sr-only">{spokenDayName(day)}</span>}
    </>
  );
}
