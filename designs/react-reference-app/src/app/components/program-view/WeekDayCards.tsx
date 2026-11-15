import { isSameDay } from 'date-fns';
import type { Exercise } from '../../context/TrainingContext';
import { WEEKDAYS, type Block, type Weekday } from '../../domain/program';
import { DAY_CARDS_CLASS, DayCard } from './dayCard';
import { sessionAnchor } from './programView';
import { cn } from '../ui/utils';

type WeekDayCardsProps = { block: Block; dates: Record<Weekday, Date>; today: Date; exercisesById: ReadonlyMap<string, Exercise> };

export function WeekDayCards({ block, dates, today, exercisesById }: WeekDayCardsProps) {
  return (
    <ol className={cn(DAY_CARDS_CLASS, 'sm:grid-cols-4 lg:grid-cols-7')}>
      {WEEKDAYS.map(day => (
        <DayCard
          key={day}
          block={block}
          day={day}
          exercisesById={exercisesById}
          headingLevel="h3"
          current={isSameDay(dates[day], today) ? 'date' : undefined}
          corner={<span className="text-xs tabular-nums text-text-secondary">{dates[day].getDate()}</span>}
          renderChip={chip => (
            <a href={`#${sessionAnchor(chip.id)}`} className={chip.className}>
              {chip.label}
            </a>
          )}
        />
      ))}
    </ol>
  );
}
