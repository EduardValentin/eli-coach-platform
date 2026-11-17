import { cn } from '../ui/utils';
import { CHECK_IN_DAY_LABEL } from './CheckInDayNote';
import { CheckInLabel, dayCellVariants, type DayKind } from './DayCell';
import { DayTile } from './DayTile';
import type { ExerciseLibrary } from './programView';
import { dayDateText, dayLengthOf, dayPlanName, type WeekDay } from './weekView';

type AgendaState = 'planned' | 'to-come';

const TO_COME = 'Sessions to come';
const REST: WeekDay['plan'] = { kind: 'rest' };

const NAME_CLASS: Record<DayKind, string> = {
  session: 'font-semibold text-text-primary sm:group-hover/day:underline',
  cardio: 'max-sm:font-medium max-sm:text-training-recovery-ink sm:font-semibold sm:text-text-primary sm:group-hover/day:underline',
  rest: 'text-text-secondary sm:font-medium',
};

const LENGTH_INK: Record<DayKind, string> = {
  session: 'text-text-secondary',
  cardio: 'max-sm:text-training-recovery-ink sm:text-text-secondary',
  rest: 'text-text-secondary',
};

function spokenDay(day: WeekDay, name: string, length: string | undefined): string {
  return [dayDateText(day), name, ...(day.checkIn ? [CHECK_IN_DAY_LABEL.toLowerCase()] : []), ...(length ? [length] : [])].join(', ');
}

type AgendaDayProps = { day: WeekDay; name: string; exercisesById: ExerciseLibrary; href: string | undefined };

/** One element per day: a row on a phone, and from `sm` a tile over a caption whose name and length line up across the week. */
function AgendaDay({ day, name, exercisesById, href }: AgendaDayProps) {
  const { kind } = day.plan;
  const length = dayLengthOf(day.plan, exercisesById);
  const Entry = href ? 'a' : 'div';
  return (
    <Entry href={href} className={dayCellVariants({ variant: 'agenda', kind })}>
      <DayTile day={day} className="max-sm:contents" />
      <span aria-hidden="true" className="grid min-w-0 content-start gap-0.5 break-words max-sm:col-start-3 max-sm:row-start-1 max-sm:text-base max-sm:leading-snug sm:mt-[1.8mm]">
        <span className={cn('sm:line-clamp-2 sm:text-document-note', NAME_CLASS[kind])}>{name}</span>
        {day.checkIn && <CheckInLabel className="sm:hidden" />}
      </span>
      {length && (
        <span
          aria-hidden="true"
          className={cn('tabular-nums max-sm:col-start-4 max-sm:row-start-1 max-sm:text-sm max-sm:whitespace-nowrap sm:mt-[0.4mm] sm:text-document-note', LENGTH_INK[kind])}
        >
          {length.shown}
        </span>
      )}
      <span className="sr-only">{spokenDay(day, name, length?.spoken)}</span>
    </Entry>
  );
}

type WeekAgendaProps = {
  days: readonly WeekDay[];
  exercisesById: ExerciseLibrary;
  state?: AgendaState;
  hrefOf?: (day: WeekDay) => string | undefined;
};

export function WeekAgenda({ days, exercisesById, state = 'planned', hrefOf }: WeekAgendaProps) {
  const toCome = state === 'to-come';
  return (
    <ol data-parity="week-agenda" aria-label="Days of the week" className="grid gap-2 sm:grid-cols-7 sm:gap-x-(--week-column-gap) sm:gap-y-0">
      {days.map(day => (
        <li key={day.weekday} data-print-keep className="grid sm:row-span-3 sm:grid-rows-subgrid">
          <AgendaDay
            day={toCome ? { ...day, plan: REST } : day}
            name={toCome ? TO_COME : dayPlanName(day.plan)}
            exercisesById={exercisesById}
            href={toCome ? undefined : hrefOf?.(day)}
          />
        </li>
      ))}
    </ol>
  );
}
