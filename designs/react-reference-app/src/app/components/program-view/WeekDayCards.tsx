import { isSameDay } from 'date-fns';
import { cardioOn, sessionOn, WEEKDAYS, type Block, type Weekday } from '../../domain/program';
import { CARDIO_CHIP_CLASS, CardioLength, DayCardFrame, DayName, RestLabel, sessionChipClass } from './dayCard';
import { sessionAnchor } from './programView';

type WeekDayCardsProps = { block: Block; dates: Record<Weekday, Date>; today: Date };

function DayCard({ block, day, date, today }: { block: Block; day: Weekday; date: Date; today: Date }) {
  const session = sessionOn(block, day);
  const cardio = cardioOn(block, day);

  return (
    <DayCardFrame entry={block.calendar[day].kind} current={isSameDay(date, today) ? 'date' : undefined}>
      <h3 className="flex items-baseline justify-between gap-1">
        <DayName day={day} />
        <span className="text-xs tabular-nums text-text-secondary">{date.getDate()}</span>
      </h3>
      {session && (
        <a href={`#${sessionAnchor(session.id)}`} className={sessionChipClass(block.type)}>
          <span className="truncate">{session.name}</span>
        </a>
      )}
      {cardio && (
        <>
          <a href={`#${sessionAnchor(cardio.id)}`} className={CARDIO_CHIP_CLASS}>
            <span className="truncate">{cardio.name}</span>
          </a>
          <CardioLength cardio={cardio} />
        </>
      )}
      {!session && !cardio && <RestLabel />}
    </DayCardFrame>
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
