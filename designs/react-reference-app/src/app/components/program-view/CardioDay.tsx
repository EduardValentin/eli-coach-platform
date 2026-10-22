import { useId } from 'react';
import type { Exercise } from '../../context/TrainingContext';
import type { CardioPlan, CardioSegment, CardioSession, CircuitItem } from '../../domain/program';
import { CARDIO_INTENSITY_TEXT, cardioMinutes } from '../../domain/programCardio';
import { ColumnBreak, DayHeader, Dot } from './DayParts';

type Library = ReadonlyMap<string, Exercise>;
type CircuitPlan = Extract<CardioPlan, { kind: 'circuit' }>;

const SEGMENT_CLASS = 'grid gap-1 rounded-card border border-l-4 border-border/50 border-l-training-recovery bg-card p-4 shadow-soft';

function nameOf(id: string, exercisesById: Library): string {
  return exercisesById.get(id)?.name ?? 'Exercise removed';
}

function itemAmount(item: CircuitItem): string {
  return item.seconds === undefined ? `${item.reps ?? 0} reps` : `${item.seconds} s`;
}

function CircuitSegment({ plan, exercisesById }: { plan: CircuitPlan; exercisesById: Library }) {
  return (
    <li className={SEGMENT_CLASS}>
      <p className="text-base font-semibold text-text-primary">Circuit</p>
      <ColumnBreak />
      <p className="text-sm text-text-secondary tabular-nums">
        <span>{`${plan.rounds} rounds`}</span>
        <Dot />
        <span>{`${plan.restSeconds} s rest between rounds`}</span>
      </p>
      <ul className="mt-2 divide-y divide-border-subtle rounded-control bg-surface-subtle px-3">
        {plan.items.map((item, index) => (
          <li key={`${item.exerciseId}-${index}`} className="flex items-baseline justify-between gap-3 py-2.5 text-sm text-text-primary">
            <span className="min-w-0">{nameOf(item.exerciseId, exercisesById)}</span>
            <ColumnBreak />
            <span className="shrink-0 tabular-nums">{itemAmount(item)}</span>
          </li>
        ))}
      </ul>
    </li>
  );
}

function amountOf(plan: Exclude<CardioPlan, CircuitPlan>): string {
  if (plan.kind === 'steady') return `${plan.minutes} min`;
  return `${plan.rounds} × ${plan.workSeconds} s hard / ${plan.easySeconds} s easy`;
}

function Segment({ segment, exercisesById }: { segment: CardioSegment; exercisesById: Library }) {
  const { plan } = segment;
  if (plan.kind === 'circuit') return <CircuitSegment plan={plan} exercisesById={exercisesById} />;
  return (
    <li className={SEGMENT_CLASS}>
      <p className="text-base font-semibold text-text-primary">{nameOf(segment.exerciseId, exercisesById)}</p>
      <ColumnBreak />
      <p className="text-sm font-medium text-text-primary tabular-nums">{amountOf(plan)}</p>
      <ColumnBreak />
      <p className="text-sm text-text-secondary">{CARDIO_INTENSITY_TEXT[plan.intensity]}</p>
    </li>
  );
}

type CardioDayProps = { cardio: CardioSession; exercisesById: Library };

export function CardioDay({ cardio, exercisesById }: CardioDayProps) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="@container grid gap-4">
      <DayHeader headingId={headingId} name={cardio.name} meta={`${cardioMinutes(cardio)} min`} />
      <ol aria-label="Segments" className="grid items-start gap-3 @3xl:grid-cols-2">
        {cardio.segments.map(segment => (
          <Segment key={segment.id} segment={segment} exercisesById={exercisesById} />
        ))}
      </ol>
    </section>
  );
}
