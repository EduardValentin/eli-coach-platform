import { useId, type Ref } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { ArrowDown, ArrowUp, GripVertical, Plus, Trash2, X } from 'lucide-react';
import type { Exercise } from '../../../context/TrainingContext';
import type { CardioIntensity, CardioPlan, CardioSegment, CardioSession, CircuitItem } from '../../../domain/program';
import { CARDIO_INTENSITY_LABELS, SEGMENT_KIND_LABELS, type CardioEdits } from '../../../domain/programCardio';
import { RowActionsMenu } from '../../RowActionsMenu';
import { LABEL_CLASS } from '../../typography';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { cn } from '../../ui/utils';
import { RowTextField } from './RowTextField';
import { SegmentedChoice } from './SegmentedChoice';
import { CARDIO_SEGMENT, LIBRARY_EXERCISE, type CardioSegmentItem, type LibraryItem } from './sessionDnd';

type CircuitPlan = Extract<CardioPlan, { kind: 'circuit' }>;
type ItemMeasure = 'reps' | 'seconds';

type CardioSegmentCardProps = {
  cardioId: string;
  segment: CardioSegment;
  position: number;
  count: number;
  library: readonly Exercise[];
  edits: CardioEdits;
  onChange: (cardio: CardioSession) => void;
  onReplaceExercise: () => void;
  onAddCircuitItem: () => void;
};

const INTENSITY_OPTIONS = (Object.keys(CARDIO_INTENSITY_LABELS) as CardioIntensity[]).map(value => ({ value, label: CARDIO_INTENSITY_LABELS[value] }));
const MEASURE_OPTIONS: { value: ItemMeasure; label: string }[] = [
  { value: 'reps', label: 'Reps' },
  { value: 'seconds', label: 'Sec' },
];
const COUNT_PROBLEM = 'Use a whole number';

function parseCount(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const count = Number(trimmed);
  return count > 0 ? count : null;
}

function NumberField({ label, unit, value, onCommit }: { label: string; unit?: string; value: number; onCommit: (value: number) => void }) {
  return (
    <label className="grid content-start gap-1">
      <span className={LABEL_CLASS}>{label}</span>
      <RowTextField className="w-20" type="number" label={label} value={value} format={String} parse={parseCount} problem={COUNT_PROBLEM} suffix={unit} onCommit={onCommit} />
    </label>
  );
}

function IntensityField({ value, onChange }: { value: CardioIntensity; onChange: (value: CardioIntensity) => void }) {
  return (
    <div className="grid content-start gap-1">
      <span aria-hidden="true" className={LABEL_CLASS}>
        Intensity
      </span>
      <div className="w-60 max-w-full">
        <SegmentedChoice legend="Intensity" options={INTENSITY_OPTIONS} value={value} onChange={onChange} />
      </div>
    </div>
  );
}

function measuredItem(item: CircuitItem, measure: ItemMeasure, amount: number): CircuitItem {
  return measure === 'seconds' ? { exerciseId: item.exerciseId, seconds: amount } : { exerciseId: item.exerciseId, reps: amount };
}

function CircuitFields({ plan, library, onPlan, onItem, onRemoveItem, onAddItem }: {
  plan: CircuitPlan;
  library: readonly Exercise[];
  onPlan: (plan: CircuitPlan) => void;
  onItem: (index: number, item: CircuitItem) => void;
  onRemoveItem: (index: number) => void;
  onAddItem: () => void;
}) {
  const nameOf = (id: string) => library.find(item => item.id === id)?.name ?? 'Unknown exercise';
  return (
    <div className="grid gap-3">
      {plan.items.length > 0 && (
        <ol aria-label="Circuit exercises" className="grid divide-y divide-border-subtle rounded-field border border-border-subtle bg-surface-base">
          {plan.items.map((item, index) => {
            const name = nameOf(item.exerciseId);
            const measure: ItemMeasure = item.seconds === undefined ? 'reps' : 'seconds';
            const amount = item.seconds ?? item.reps ?? 0;
            return (
              <li key={`${item.exerciseId}-${index}`} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2">
                <span className="min-w-0 flex-1 basis-32 text-sm font-medium text-text-primary">{name}</span>
                <RowTextField
                  className="w-16"
                  type="number"
                  label={`${name} ${measure === 'reps' ? 'reps' : 'seconds'}`}
                  value={amount}
                  format={String}
                  parse={parseCount}
                  problem={COUNT_PROBLEM}
                  onCommit={next => onItem(index, measuredItem(item, measure, next))}
                />
                <div className="w-28">
                  <SegmentedChoice legend={`${name} measured in`} options={MEASURE_OPTIONS} value={measure} onChange={next => onItem(index, measuredItem(item, next, amount))} />
                </div>
                <Button variant="ghost" size="icon-xs" aria-label={`Remove ${name}`} onClick={() => onRemoveItem(index)}>
                  <X aria-hidden="true" />
                </Button>
              </li>
            );
          })}
        </ol>
      )}
      <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
        <Button variant="outline" size="xs" aria-label="Add exercise to the circuit" onClick={onAddItem}>
          <Plus aria-hidden="true" />
          Add exercise
        </Button>
        <NumberField label="Rounds" value={plan.rounds} onCommit={rounds => onPlan({ ...plan, rounds })} />
        <NumberField label="Rest" unit="s" value={plan.restSeconds} onCommit={restSeconds => onPlan({ ...plan, restSeconds })} />
      </div>
    </div>
  );
}

function PlanFields({ segment, library, edits, onChange, onAddCircuitItem }: Pick<CardioSegmentCardProps, 'segment' | 'library' | 'edits' | 'onChange' | 'onAddCircuitItem'>) {
  const { plan } = segment;
  const changePlan = (next: CardioPlan) => onChange(edits.changePlan(segment.id, next));
  if (plan.kind === 'steady') {
    return (
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <NumberField label="Minutes" value={plan.minutes} onCommit={minutes => changePlan({ ...plan, minutes })} />
        <IntensityField value={plan.intensity} onChange={intensity => changePlan({ ...plan, intensity })} />
      </div>
    );
  }
  if (plan.kind === 'intervals') {
    return (
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <NumberField label="Work" unit="s" value={plan.workSeconds} onCommit={workSeconds => changePlan({ ...plan, workSeconds })} />
        <NumberField label="Easy" unit="s" value={plan.easySeconds} onCommit={easySeconds => changePlan({ ...plan, easySeconds })} />
        <NumberField label="Rounds" value={plan.rounds} onCommit={rounds => changePlan({ ...plan, rounds })} />
        <IntensityField value={plan.intensity} onChange={intensity => changePlan({ ...plan, intensity })} />
      </div>
    );
  }
  return (
    <CircuitFields
      plan={plan}
      library={library}
      onPlan={changePlan}
      onItem={(index, item) => onChange(edits.changeCircuitItem(segment.id, index, item))}
      onRemoveItem={index => onChange(edits.removeCircuitItem(segment.id, index))}
      onAddItem={onAddCircuitItem}
    />
  );
}

type DropState = { isOver: boolean; canDrop: boolean; itemType: string | symbol | null };

function dropHint(itemType: string | symbol | null, plan: CardioPlan): string {
  if (itemType === CARDIO_SEGMENT) return 'Move here';
  return plan.kind === 'circuit' ? 'Add to the circuit' : 'Replace';
}

function circuitCount(plan: CircuitPlan): string {
  return `${plan.items.length} ${plan.items.length === 1 ? 'exercise' : 'exercises'}`;
}

export function CardioSegmentCard(props: CardioSegmentCardProps) {
  const { cardioId, segment, position, count, library, edits, onChange, onReplaceExercise, onAddCircuitItem } = props;
  const headingId = useId();
  const kindLabel = SEGMENT_KIND_LABELS[segment.plan.kind];
  const exerciseName = library.find(item => item.id === segment.exerciseId)?.name ?? 'Choose an exercise';
  const isCircuit = segment.plan.kind === 'circuit';
  const label = `${position}. ${kindLabel}`;

  const [{ isDragging }, drag] = useDrag<CardioSegmentItem, void, { isDragging: boolean }>(
    () => ({ type: CARDIO_SEGMENT, item: { cardioId, segmentId: segment.id, label }, collect: monitor => ({ isDragging: monitor.isDragging() }) }),
    [cardioId, segment.id, label],
  );

  const [{ isOver, canDrop, itemType }, drop] = useDrop<CardioSegmentItem | LibraryItem, void, DropState>(
    () => ({
      accept: [CARDIO_SEGMENT, LIBRARY_EXERCISE],
      canDrop: (item, monitor) => {
        if (monitor.getItemType() === CARDIO_SEGMENT) {
          const moving = item as CardioSegmentItem;
          return moving.cardioId === cardioId && moving.segmentId !== segment.id;
        }
        const { exercise } = item as LibraryItem;
        return isCircuit ? exercise.type !== 'mobility' : exercise.type === 'cardio';
      },
      drop: (item, monitor) => {
        if (monitor.didDrop()) return;
        if (monitor.getItemType() === CARDIO_SEGMENT) onChange(edits.moveBefore((item as CardioSegmentItem).segmentId, segment.id));
        else if (isCircuit) onChange(edits.addCircuitItem(segment.id, (item as LibraryItem).exercise.id));
        else onChange(edits.replaceExercise(segment.id, (item as LibraryItem).exercise.id));
      },
      collect: monitor => ({ isOver: monitor.isOver({ shallow: true }), canDrop: monitor.canDrop(), itemType: monitor.getItemType() }),
    }),
    [cardioId, segment.id, isCircuit, edits, onChange],
  );
  const targeted = isOver && canDrop;

  return (
    <article
      ref={drop as unknown as Ref<HTMLElement>}
      aria-labelledby={headingId}
      className={cn('relative grid gap-3 rounded-control border bg-card p-3 transition-[border-color,box-shadow,opacity] motion-reduce:transition-none', {
        'border-brand-secondary ring-2 ring-brand-secondary/20': targeted,
        'border-border': !targeted,
        'opacity-40': isDragging,
      })}
    >
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <span
          ref={drag as unknown as Ref<HTMLSpanElement>}
          aria-hidden="true"
          className="flex h-7 shrink-0 cursor-grab touch-none items-center select-none text-text-secondary hover:text-text-primary active:cursor-grabbing"
        >
          <GripVertical size={16} />
        </span>
        <h5 id={headingId} className="flex min-w-0 flex-1 items-center gap-2.5">
          <Badge tone="tint-cyan">{kindLabel}</Badge>
          {segment.plan.kind === 'circuit' ? (
            <span className="text-sm text-text-secondary">{circuitCount(segment.plan)}</span>
          ) : (
            <Button variant="link" size="xs" className="h-auto min-w-0 px-0 text-sm font-medium text-text-primary" aria-label={`Replace ${exerciseName}`} onClick={onReplaceExercise}>
              <span className="truncate">{exerciseName}</span>
            </Button>
          )}
        </h5>
        <RowActionsMenu
          label={`${label} actions`}
          actions={[
            { name: 'up', label: 'Move up', icon: ArrowUp, disabled: position === 1, onSelect: () => onChange(edits.moveUp(segment.id)) },
            { name: 'down', label: 'Move down', icon: ArrowDown, disabled: position === count, onSelect: () => onChange(edits.moveDown(segment.id)) },
            { name: 'remove', label: 'Remove', icon: Trash2, tone: 'destructive', onSelect: () => onChange(edits.remove(segment.id)) },
          ]}
        />
      </div>
      <div className="pl-9.5">
        <PlanFields segment={segment} library={library} edits={edits} onChange={onChange} onAddCircuitItem={onAddCircuitItem} />
      </div>
      {targeted && (
        <p aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-control bg-brand-secondary-soft">
          <span className="rounded-control bg-card px-3 py-1.5 text-sm font-medium text-brand-secondary shadow-raised">
            {dropHint(itemType, segment.plan)}
          </span>
        </p>
      )}
    </article>
  );
}
