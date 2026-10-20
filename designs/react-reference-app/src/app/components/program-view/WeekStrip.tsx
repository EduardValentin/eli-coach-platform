import { addDays, format, isSameDay } from 'date-fns';
import { WEEKDAYS, type Block, type Weekday } from '../../domain/program';
import { cn } from '../ui/utils';
import { CARDIO_TYPE_LABELS } from '../coach-portal/program/program-constants';
import { cardioFor, dayEntries, sessionFor } from './programView';

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
  const cardio = cardioFor(block, weekday);
  if (!cardio) return 'Cardio';
  const label = cardio.type === 'liss' || cardio.type === 'moderate' ? 'Walk' : CARDIO_TYPE_LABELS[cardio.type];
  return `${label} ${cardio.minutes}`;
}

type WeekStripProps = {
  block: Block;
  weekStart: Date;
  today: Date;
  selected: Weekday;
  onSelect: (weekday: Weekday) => void;
};

export function WeekStrip({ block, weekStart, today, selected, onSelect }: WeekStripProps) {
  return (
    <div role="tablist" aria-label="This week" className="grid grid-cols-7 gap-1">
      {WEEKDAYS.map((weekday, index) => {
        const date = addDays(weekStart, index);
        const isSelected = weekday === selected;
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
              'flex min-w-0 flex-col items-center gap-0.5 rounded-card border border-border/50 px-1 py-2 text-center text-xs text-text-secondary',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
              { 'bg-primary text-primary-foreground': isSelected, 'border-primary': isSameDay(date, today) },
            )}
          >
            <span className="font-medium">{format(date, 'EEE d')}</span>
            <span className="w-full truncate">{entryLabel(block, weekday)}</span>
          </button>
        );
      })}
    </div>
  );
}
