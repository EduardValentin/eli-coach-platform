import type { KeyboardEvent } from 'react';
import { addDays, format, isSameDay } from 'date-fns';
import { Dumbbell, Footprints, Moon, type LucideIcon } from 'lucide-react';
import { WEEKDAYS, type Block, type CalendarEntry, type Weekday } from '../../domain/program';
import { cn } from '../ui/utils';
import { cardioDayLabel, dayEntries, sessionFor } from './programView';

export function dayTabId(weekday: Weekday): string {
  return `program-day-tab-${weekday}`;
}

export function dayPanelId(weekday: Weekday): string {
  return `program-day-panel-${weekday}`;
}

function entryLabel(block: Block, weekday: Weekday): string {
  const entry = dayEntries(block, weekday);
  if (entry.kind === 'rest') return 'Rest';
  if (entry.kind === 'session') return sessionFor(block, weekday)?.name ?? 'Session';
  return cardioDayLabel(block, weekday);
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
    <div className="@container">
      <div role="tablist" aria-label="This week" onKeyDown={moveWithKey} className="-mx-2 grid grid-cols-7 gap-0.5 @min-[36rem]:mx-0 @min-[36rem]:gap-1">
        {WEEKDAYS.map((weekday, index) => {
          const date = addDays(weekStart, index);
          const isSelected = weekday === selected;
          const EntryIcon = ENTRY_ICONS[dayEntries(block, weekday).kind];
          return (
            <button
              key={weekday}
              type="button"
              role="tab"
              id={dayTabId(weekday)}
              aria-controls={dayPanelId(weekday)}
              aria-selected={isSelected}
              aria-current={isSameDay(date, today) ? 'date' : undefined}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => onSelect(weekday)}
              className={cn(
                'flex min-h-11 min-w-0 flex-col items-center gap-1 rounded-card border border-border/50 px-1 py-2 text-center text-xs text-text-secondary',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                { 'bg-primary text-primary-foreground': isSelected, 'border-primary': isSameDay(date, today) },
              )}
            >
              <span className="flex flex-col items-center leading-tight">
                <span>{format(date, 'EEE')}</span>{' '}
                <span className="text-sm font-semibold tabular-nums">{format(date, 'd')}</span>
              </span>
              <EntryIcon aria-hidden="true" size={16} className="@min-[36rem]:hidden" />
              <span className="sr-only @min-[36rem]:not-sr-only @min-[36rem]:w-full @min-[36rem]:truncate">{entryLabel(block, weekday)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
