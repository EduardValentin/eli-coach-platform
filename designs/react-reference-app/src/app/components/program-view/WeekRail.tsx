import { TabsList, TabsTrigger } from '../ui/tabs';
import { cn } from '../ui/utils';
import { DayCell, dayCellVariants } from './DayCell';
import type { WeekView } from './weekView';

/** `narrow-rows` wraps a narrow rail into rows of four, for days that show their date; `one-row` keeps all seven side by side. */
export type WeekRailWrap = 'narrow-rows' | 'one-row';

/** `selectable` makes a rest day a tab like any other; `inert` keeps it in the tab list as a disabled tab, skipped by the arrow keys, since it shows nothing. */
export type RestDays = 'selectable' | 'inert';

type WeekRailTabsProps = {
  label: string;
  week: Pick<WeekView, 'days'>;
  wrap?: WeekRailWrap;
  restDays?: RestDays;
};

const TOUCHING_CELL_CLASS = 'not-first:-ml-px not-first:w-[calc(100%+1px)] @3xl:not-first:ml-0 @3xl:not-first:w-full';

const WRAPPING_CELL_CLASS = '@max-rail-wrap:rounded-control @max-rail-wrap:not-first:ml-0 @max-rail-wrap:not-first:w-full';

export function WeekRailTabs({ label, week, wrap = 'narrow-rows', restDays = 'selectable' }: WeekRailTabsProps) {
  const wraps = wrap === 'narrow-rows';
  return (
    <TabsList aria-label={label} className={cn('grid-cols-7 @3xl:gap-2', { '@max-rail-wrap:grid-cols-4 @max-rail-wrap:gap-2': wraps })}>
      {week.days.map(day => {
        const inert = restDays === 'inert' && day.plan.kind === 'rest';
        return (
          <TabsTrigger
            key={day.weekday}
            value={day.weekday}
            disabled={inert}
            aria-disabled={inert ? true : undefined}
            aria-current={day.isToday ? 'date' : undefined}
            data-parity="rail-day"
            className={cn(dayCellVariants({ variant: 'rail', kind: day.plan.kind }), TOUCHING_CELL_CLASS, {
              [WRAPPING_CELL_CLASS]: wraps,
              'disabled:opacity-100': inert,
            })}
          >
            <DayCell day={day} />
          </TabsTrigger>
        );
      })}
    </TabsList>
  );
}
