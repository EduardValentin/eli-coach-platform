import type { ReactNode } from 'react';
import type { Exercise } from '../../context/TrainingContext';
import { WEEKDAY_LABELS, weekdayAbbreviation, type BlockType, type CalendarEntry, type CardioSession, type Session, type Weekday } from '../../domain/program';
import { cardioMinutes } from '../../domain/programCardio';
import { estimatedDuration, estimatedMinutes } from '../../domain/sessionTiming';
import { EYEBROW_CLASS } from '../typography';
import { cn } from '../ui/utils';
import { BLOCK_RULE, BLOCK_SOFT } from './blockColours';

const KIND_CHIP_CLASS =
  'relative hit-area inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-field border px-2 py-1 text-left text-xs font-medium outline-none hover:shadow-soft';

export const CHIP_LABEL_CLASS = 'line-clamp-2 min-w-0 break-words';

export function sessionChipClass(type: BlockType): string {
  return cn(KIND_CHIP_CLASS, BLOCK_SOFT[type], BLOCK_RULE[type], 'text-text-primary');
}

export const CARDIO_CHIP_CLASS = cn(KIND_CHIP_CLASS, 'border-training-recovery bg-training-recovery-soft text-training-recovery-ink');

type DayCardFrameProps = { entry: CalendarEntry['kind']; current?: 'date'; children: ReactNode };

export function DayCardFrame({ entry, current, children }: DayCardFrameProps) {
  return (
    <li
      aria-current={current}
      className={cn('grid min-w-0 content-start gap-2 rounded-control border p-2', {
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
    <span className={EYEBROW_CLASS}>
      <span aria-hidden="true">{weekdayAbbreviation(day)}</span>
      <span className="sr-only">{weekday}</span>
    </span>
  );
}

export const DAY_CARDS_CLASS = 'grid auto-rows-fr grid-cols-2';

function DayLength({ children }: { children: string }) {
  return <span className="px-0.5 text-xs text-text-secondary tabular-nums">{children}</span>;
}

export function SessionLength({ session, exercisesById }: { session: Session; exercisesById: ReadonlyMap<string, Exercise> }) {
  return <DayLength>{estimatedDuration(estimatedMinutes(session, exercisesById))}</DayLength>;
}

export function CardioLength({ cardio }: { cardio: CardioSession }) {
  return <DayLength>{`${cardioMinutes(cardio)} min`}</DayLength>;
}

export function RestLabel() {
  return <span className="px-2 py-1 text-xs font-medium text-text-secondary">Rest</span>;
}
