import { isSameDay } from 'date-fns';
import type { Exercise } from '../../context/TrainingContext';
import { cardioOn, sessionOn, WEEKDAYS, type Block, type Weekday } from '../../domain/program';
import { CARDIO_CHIP_CLASS, CardioLength, CHIP_LABEL_CLASS, DAY_CARDS_CLASS, DayCardFrame, DayName, RestLabel, SessionLength, sessionChipClass } from './dayCard';
import { sessionAnchor } from './programView';
import { cn } from '../ui/utils';

type WeekDayCardsProps = { block: Block; dates: Record<Weekday, Date>; today: Date; exercisesById: ReadonlyMap<string, Exercise> };
type DayCardProps = Omit<WeekDayCardsProps, 'dates'> & { day: Weekday; date: Date };

function DayCard({ block, day, date, today, exercisesById }: DayCardProps) {
  const session = sessionOn(block, day);
  const cardio = cardioOn(block, day);

  return (
    <DayCardFrame entry={block.calendar[day].kind} current={isSameDay(date, today) ? 'date' : undefined}>
      <h3 className="flex items-baseline justify-between gap-1">
        <DayName day={day} />
        <span className="text-xs tabular-nums text-text-secondary">{date.getDate()}</span>
      </h3>
      {session && (
        <>
          <a href={`#${sessionAnchor(session.id)}`} className={sessionChipClass(block.type)}>
            <span className={CHIP_LABEL_CLASS}>{session.name}</span>
          </a>
          <SessionLength session={session} exercisesById={exercisesById} />
        </>
      )}
      {cardio && (
        <>
          <a href={`#${sessionAnchor(cardio.id)}`} className={CARDIO_CHIP_CLASS}>
            <span className={CHIP_LABEL_CLASS}>{cardio.name}</span>
          </a>
          <CardioLength cardio={cardio} />
        </>
      )}
      {!session && !cardio && <RestLabel />}
    </DayCardFrame>
  );
}

export function WeekDayCards({ block, dates, today, exercisesById }: WeekDayCardsProps) {
  return (
    <ol className={cn(DAY_CARDS_CLASS, 'gap-2 sm:grid-cols-4 lg:grid-cols-7')}>
      {WEEKDAYS.map(day => (
        <DayCard key={day} block={block} day={day} date={dates[day]} today={today} exercisesById={exercisesById} />
      ))}
    </ol>
  );
}
