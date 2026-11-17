import type { MouseEvent } from 'react';
import type { Weekday } from '../../domain/program';
import { TabsList, TabsTrigger } from '../ui/tabs';
import { cn } from '../ui/utils';
import { DayCell, dayCellVariants } from './DayCell';
import type { ExerciseLibrary } from './programView';
import { dayAnchor, type WeekView } from './weekView';

type WeekRailProps = { label: string; week: WeekView; exercisesById: ExerciseLibrary };

const TOUCHING_CELL_CLASS = cn(
  'not-first:-ml-px not-first:w-[calc(100%+1px)]',
  '@max-rail-wrap:rounded-control @max-rail-wrap:not-first:ml-0 @max-rail-wrap:not-first:w-full',
  '@3xl:not-first:ml-0 @3xl:not-first:w-full',
);

export function WeekRailTabs({ label, week, selected, exercisesById }: WeekRailProps & { selected: Weekday }) {
  return (
    <TabsList aria-label={label} className="grid-cols-7 @max-rail-wrap:grid-cols-4 @max-rail-wrap:gap-2 @3xl:gap-2">
      {week.days.map(day => (
        <TabsTrigger
          key={day.weekday}
          value={day.weekday}
          aria-current={day.isToday ? 'date' : undefined}
          data-parity="rail-day"
          className={cn(dayCellVariants({ variant: 'rail', kind: day.plan.kind }), TOUCHING_CELL_CLASS)}
          // Only the chosen day's panel is mounted, so the other triggers must not point at a missing id.
          {...(day.weekday === selected ? {} : { 'aria-controls': undefined })}
        >
          <DayCell day={day} exercisesById={exercisesById} variant="rail" />
        </TabsTrigger>
      ))}
    </TabsList>
  );
}

export function WeekRailLinks({ label, week, exercisesById, onFollow }: WeekRailProps & { onFollow: (weekday: Weekday) => void }) {
  function follow(event: MouseEvent, weekday: Weekday) {
    event.preventDefault();
    onFollow(weekday);
  }

  return (
    <nav aria-label={label}>
      <ol className="grid grid-cols-4 gap-2 @3xl:grid-cols-7">
        {week.days.map(day => (
          <li key={day.weekday} className="grid">
            <a
              href={`#${dayAnchor(day.weekday)}`}
              aria-current={day.isToday ? 'date' : undefined}
              data-parity="rail-day"
              onClick={event => follow(event, day.weekday)}
              className={cn(dayCellVariants({ variant: 'rail', kind: day.plan.kind }), 'rounded-control')}
            >
              <DayCell day={day} exercisesById={exercisesById} variant="rail" />
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
