import type { ReactNode } from 'react';
import { WEEKDAY_LABELS, type BlockType, type CalendarEntry, type CardioSession, type Weekday } from '../../domain/program';
import { cardioMinutes } from '../../domain/programCardio';
import { LABEL_CLASS } from '../typography';
import { cn } from '../ui/utils';
import { BLOCK_SOFT } from './blockColours';

const KIND_CHIP_CLASS =
  'inline-flex max-w-full items-center gap-1.5 rounded-field px-2 py-1 text-left text-xs font-medium outline-none hover:shadow-soft';

export function sessionChipClass(type: BlockType): string {
  return cn(KIND_CHIP_CLASS, BLOCK_SOFT[type], 'text-text-primary');
}

export const CARDIO_CHIP_CLASS = cn(KIND_CHIP_CLASS, 'bg-training-recovery-soft text-training-recovery');

type DayCardFrameProps = { entry: CalendarEntry['kind']; current?: 'date'; children: ReactNode };

export function DayCardFrame({ entry, current, children }: DayCardFrameProps) {
  return (
    <li
      aria-current={current}
      className={cn('grid content-start gap-2 rounded-control border p-2', {
        'border-border bg-card': entry !== 'rest',
        'border-border-subtle bg-surface-subtle': entry === 'rest',
        'border-primary ring-2 ring-primary/30': current === 'date',
      })}
    >
      {children}
    </li>
  );
}

export function DayName({ day }: { day: Weekday }) {
  const weekday = WEEKDAY_LABELS[day];
  return (
    <span className={LABEL_CLASS}>
      <span aria-hidden="true">{weekday.slice(0, 3)}</span>
      <span className="sr-only">{weekday}</span>
    </span>
  );
}

export function CardioLength({ cardio }: { cardio: CardioSession }) {
  if (cardio.segments.length === 0) return null;
  return <span className="px-0.5 text-xs text-text-secondary tabular-nums">{`${cardioMinutes(cardio)} min`}</span>;
}

export function RestLabel() {
  return <span className="px-2 py-1 text-xs font-medium text-text-secondary">Rest</span>;
}
