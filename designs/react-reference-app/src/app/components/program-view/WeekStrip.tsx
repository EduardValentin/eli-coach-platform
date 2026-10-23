import type { KeyboardEvent } from 'react';
import { addDays, format, isSameDay } from 'date-fns';
import { Dumbbell, Footprints, Moon, type LucideIcon } from 'lucide-react';
import { WEEKDAYS, type Block, type CalendarEntry, type Weekday } from '../../domain/program';
import { cn } from '../ui/utils';
import { dayEntryLabel } from './programView';

export function dayTabId(weekday: Weekday): string {
  return `program-day-tab-${weekday}`;
}

export function dayPanelId(weekday: Weekday): string {
  return `program-day-panel-${weekday}`;
}

const ENTRY_ICONS: Record<CalendarEntry['kind'], LucideIcon> = { session: Dumbbell, cardio: Footprints, rest: Moon };

type WeekStripProps = {
  block: Block;
  weekStart: Date;
  today: Date;
  selected: Weekday;
  onSelect: (weekday: Weekday) => void;
};

const LAST_DAY = WEEKDAYS.length - 1;
const KEY_TARGETS: Record<string, (index: number) => number> = {
  ArrowRight: index => (index + 1) % WEEKDAYS.length,
  ArrowLeft: index => (index + LAST_DAY) % WEEKDAYS.length,
  Home: () => 0,
  End: () => LAST_DAY,
};

export function WeekStrip({ block, weekStart, today, selected, onSelect }: WeekStripProps) {
  function moveWithKey(event: KeyboardEvent<HTMLDivElement>) {
    const target = KEY_TARGETS[event.key];
    if (!target) return;
    event.preventDefault();
    const next = WEEKDAYS[target(WEEKDAYS.indexOf(selected))];
    onSelect(next);
    document.getElementById(dayTabId(next))?.focus();
  }

  return (
    <div role="tablist" aria-label="This week" onKeyDown={moveWithKey} className="grid grid-cols-7 gap-1">
      {WEEKDAYS.map((weekday, index) => {
        const date = addDays(weekStart, index);
        const isSelected = weekday === selected;
        const isToday = isSameDay(date, today);
        const EntryIcon = ENTRY_ICONS[block.calendar[weekday].kind];
        return (
          <button
            key={weekday}
            type="button"
            role="tab"
            id={dayTabId(weekday)}
            aria-controls={dayPanelId(weekday)}
            aria-selected={isSelected}
            aria-current={isToday ? 'date' : undefined}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onSelect(weekday)}
            className={cn(
              'flex min-h-11 min-w-0 flex-col items-center gap-1 rounded-control py-2 text-center text-text-secondary transition-colors',
              'hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
              {
                'bg-surface-inverted text-surface-inverted-foreground hover:bg-surface-inverted': isSelected,
                'ring-2 ring-brand ring-inset': isToday,
              },
            )}
          >
            <span className="flex flex-col items-center gap-0.5 leading-none">
              <span className="text-xs font-medium">{format(date, 'EEE')}</span>{' '}
              <span className={cn('text-base font-semibold tabular-nums', { 'text-text-primary': !isSelected })}>{format(date, 'd')}</span>
            </span>
            <EntryIcon aria-hidden="true" className="size-3.5" />
            <span className="sr-only">{dayEntryLabel(block, weekday)}</span>
          </button>
        );
      })}
    </div>
  );
}
