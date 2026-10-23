import { isSameDay } from 'date-fns';
import { cardioOn, sessionOn, WEEKDAY_LABELS, WEEKDAYS, type Block, type Weekday } from '../../domain/program';
import { cardioMinutes } from '../../domain/programCardio';
import { BLOCK_SOFT } from '../coach-portal/program/program-constants';
import { LABEL_CLASS } from '../typography';
import { cn } from '../ui/utils';
import { sessionAnchor } from './programView';

const KIND_BADGE_CLASS =
  'inline-flex max-w-full items-center gap-1.5 rounded-field px-2 py-1 text-xs font-medium outline-none hover:brightness-95 focus-visible:ring-[3px] focus-visible:ring-ring/50';

type WeekDayCardsProps = { block: Block; dates: Record<Weekday, Date>; today: Date };

function DayCard({ block, day, date, today }: { block: Block; day: Weekday; date: Date; today: Date }) {
  const session = sessionOn(block, day);
  const cardio = cardioOn(block, day);
  const weekday = WEEKDAY_LABELS[day];
  const isToday = isSameDay(date, today);

  return (
    <li
      aria-current={isToday ? 'date' : undefined}
      className={cn('grid content-start gap-2 rounded-control border p-2', {
        'border-border bg-card': session || cardio,
        'border-border-subtle bg-surface-subtle': !session && !cardio,
        'ring-2 ring-primary/30 border-primary': isToday,
      })}
    >
      <h3 className="flex items-baseline justify-between gap-1">
        <span className={LABEL_CLASS}>
          <span aria-hidden="true">{weekday.slice(0, 3)}</span>
          <span className="sr-only">{weekday}</span>
        </span>
        <span className="text-xs tabular-nums text-text-secondary">{date.getDate()}</span>
      </h3>
      {session && (
        <a href={`#${sessionAnchor(session.id)}`} className={cn(KIND_BADGE_CLASS, BLOCK_SOFT[block.type], 'text-text-primary')}>
          <span className="truncate">{session.name}</span>
        </a>
      )}
      {cardio && (
        <>
          <a href={`#${sessionAnchor(cardio.id)}`} className={cn(KIND_BADGE_CLASS, 'bg-training-recovery-soft text-training-recovery')}>
            <span className="truncate">{cardio.name}</span>
          </a>
          {cardio.segments.length > 0 && <span className="px-0.5 text-xs text-text-secondary tabular-nums">{`${cardioMinutes(cardio)} min`}</span>}
        </>
      )}
      {!session && !cardio && <span className="px-2 py-1 text-xs font-medium text-text-secondary">Rest</span>}
    </li>
  );
}

export function WeekDayCards({ block, dates, today }: WeekDayCardsProps) {
  return (
    <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
      {WEEKDAYS.map(day => (
        <DayCard key={day} block={block} day={day} date={dates[day]} today={today} />
      ))}
    </ol>
  );
}
