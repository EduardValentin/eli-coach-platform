import type { ReactNode } from 'react';
import type { Exercise } from '../../context/TrainingContext';
import { cardioOn, sessionOn, WEEKDAY_LABELS, weekdayAbbreviation, type Block, type Weekday } from '../../domain/program';
import { cardioMinutes } from '../../domain/programCardio';
import { estimatedDuration, estimatedMinutes } from '../../domain/sessionTiming';
import { EYEBROW_CLASS } from '../typography';
import { cn } from '../ui/utils';
import { BLOCK_RULE, BLOCK_SOFT } from './blockColours';

const CHIP_SHAPE_CLASS = 'flex w-full min-w-0 items-center rounded-field border px-2 py-1 text-left text-xs font-medium';

const OPENING_CHIP_CLASS = cn(CHIP_SHAPE_CLASS, 'relative hit-area outline-none hover:shadow-soft');

const REST_CHIP_CLASS = cn(CHIP_SHAPE_CLASS, 'border-border-subtle bg-surface-subtle text-text-secondary');

export const DAY_CARDS_CLASS = 'grid auto-rows-fr grid-cols-2 gap-x-2 gap-y-3';

export type DayChip = { id: string; className: string; label: ReactNode };

type TrainingDay = { chip: DayChip; length: string };

type DayCardProps = {
  block: Block;
  day: Weekday;
  exercisesById: ReadonlyMap<string, Exercise>;
  headingLevel: 'h3' | 'h4';
  corner: ReactNode;
  renderChip: (chip: DayChip) => ReactNode;
  current?: 'date';
};

function chipLabel(name: string): ReactNode {
  return <span className="line-clamp-2 min-w-0 break-words">{name}</span>;
}

function trainingOn(block: Block, day: Weekday, exercisesById: ReadonlyMap<string, Exercise>): TrainingDay | undefined {
  const session = sessionOn(block, day);
  if (session) {
    const className = cn(OPENING_CHIP_CLASS, BLOCK_SOFT[block.type], BLOCK_RULE[block.type], 'text-text-primary');
    return { chip: { id: session.id, className, label: chipLabel(session.name) }, length: estimatedDuration(estimatedMinutes(session, exercisesById)) };
  }
  const cardio = cardioOn(block, day);
  if (!cardio) return undefined;
  const className = cn(OPENING_CHIP_CLASS, 'border-training-recovery bg-training-recovery-soft text-training-recovery-ink');
  return { chip: { id: cardio.id, className, label: chipLabel(cardio.name) }, length: `${cardioMinutes(cardio)} min` };
}

export function DayCard({ block, day, exercisesById, headingLevel: Heading, corner, renderChip, current }: DayCardProps) {
  const training = trainingOn(block, day, exercisesById);

  return (
    <li
      aria-current={current}
      className={cn('grid min-w-0 content-start gap-2 rounded-control border bg-card p-2', {
        'border-border': current !== 'date',
        'border-primary ring-2 ring-primary/30': current === 'date',
      })}
    >
      <div className="mb-5 flex h-8 items-center justify-between gap-1">
        <Heading className={cn(EYEBROW_CLASS, 'min-w-0')}>
          <span aria-hidden="true">{weekdayAbbreviation(day)}</span>
          <span className="sr-only">{WEEKDAY_LABELS[day]}</span>
        </Heading>
        {corner}
      </div>
      {training ? (
        <>
          {renderChip(training.chip)}
          <span className="px-0.5 text-xs text-text-secondary tabular-nums">{training.length}</span>
        </>
      ) : (
        <span className={REST_CHIP_CLASS}>Rest</span>
      )}
    </li>
  );
}
