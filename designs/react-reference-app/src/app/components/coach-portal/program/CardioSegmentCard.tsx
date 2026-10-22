import { useId, type Ref } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { ArrowDown, ArrowUp, GripVertical, Plus, Trash2 } from 'lucide-react';
import type { Exercise } from '../../../context/TrainingContext';
import type { CardioIntensity, CardioSegment, CardioSession, RoundsItem, RoundsSegment } from '../../../domain/program';
import { CARDIO_INTENSITY_LABELS, SEGMENT_KIND_LABELS, segmentMinutes, type CardioEdits } from '../../../domain/programCardio';
import { RowActionsMenu } from '../../RowActionsMenu';
import { LABEL_CLASS } from '../../typography';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { cn } from '../../ui/utils';
import { ExerciseItemRow, ITEM_LIST_CLASS } from './ExerciseItemRow';
import { RowTextField } from './RowTextField';
import { COUNT_PROBLEM, parseCount, parseSeconds } from './rowFields';
import { SegmentedChoice } from './SegmentedChoice';
import { CARDIO_SEGMENT, LIBRARY_EXERCISE, type CardioSegmentItem, type LibraryItem } from './sessionDnd';

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
  onAddRoundsItem: () => void;
};

const INTENSITY_OPTIONS = (Object.keys(CARDIO_INTENSITY_LABELS) as CardioIntensity[]).map(value => ({ value, label: CARDIO_INTENSITY_LABELS[value] }));
const MEASURE_OPTIONS: { value: ItemMeasure; label: string }[] = [
  { value: 'reps', label: 'Reps' },
  { value: 'seconds', label: 'Sec' },
];
type NumberFieldProps = { label: string; unit?: string; value: number; parse?: (text: string) => number | null; onCommit: (value: number) => void };

function NumberField({ label, unit, value, parse = parseCount, onCommit }: NumberFieldProps) {
  return (
    <label className="grid content-start gap-1">
      <span className={LABEL_CLASS}>{label}</span>
      <RowTextField className="w-20" type="number" label={label} value={value} format={String} parse={parse} problem={COUNT_PROBLEM} suffix={unit} onCommit={onCommit} />
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

function measuredItem(item: RoundsItem, measure: ItemMeasure, amount: number): RoundsItem {
  const base = { id: item.id, exerciseId: item.exerciseId };
  return measure === 'seconds' ? { ...base, workSeconds: amount } : { ...base, reps: amount };
}

type RoundsFieldsProps = {
  segment: RoundsSegment;
  library: readonly Exercise[];
  edits: CardioEdits;
  onChange: (cardio: CardioSession) => void;
  onAddItem: () => void;
};

function RoundsFields({ segment, library, edits, onChange, onAddItem }: RoundsFieldsProps) {
  const nameOf = (id: string) => library.find(item => item.id === id)?.name ?? 'Unknown exercise';
  const onSegment = (next: RoundsSegment) => onChange(edits.changeSegment(next));
  const onItem = (item: RoundsItem) => onChange(edits.changeRoundsItem(segment.id, item));
  const { items } = segment;
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
        <NumberField label="Rounds" value={segment.rounds} onCommit={rounds => onSegment({ ...segment, rounds })} />
        <IntensityField value={segment.intensity} onChange={intensity => onSegment({ ...segment, intensity })} />
      </div>
      {items.length > 0 && (
        <ol aria-label="Round exercises" className={ITEM_LIST_CLASS}>
          {items.map((item, index) => {
            const name = nameOf(item.exerciseId);
            const measure: ItemMeasure = item.workSeconds === undefined ? 'reps' : 'seconds';
            const amount = item.workSeconds ?? item.reps ?? 0;
            return (
              <ExerciseItemRow
                key={item.id}
                name={name}
                position={index + 1}
                count={items.length}
                onMoveUp={() => onChange(edits.moveRoundsItemUp(segment.id, item.id))}
                onMoveDown={() => onChange(edits.moveRoundsItemDown(segment.id, item.id))}
                onRemove={() => onChange(edits.removeRoundsItem(segment.id, item.id))}
              >
                <RowTextField
                  className="w-16"
                  type="number"
                  label={`${name} ${measure}`}
                  value={amount}
                  format={String}
                  parse={parseCount}
                  problem={COUNT_PROBLEM}
                  onCommit={next => onItem(measuredItem(item, measure, next))}
                />
                <div className="w-28">
                  <SegmentedChoice legend={`${name} measured in`} options={MEASURE_OPTIONS} value={measure} onChange={next => onItem(measuredItem(item, next, amount))} />
                </div>
              </ExerciseItemRow>
            );
          })}
        </ol>
      )}
      <Button variant="outline" size="xs" className="w-fit" onClick={onAddItem}>
        <Plus aria-hidden="true" />
        Add exercise
      </Button>
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <NumberField
          label="Easy between exercises"
          unit="s"
          value={segment.easySeconds}
          parse={parseSeconds}
          onCommit={easySeconds => onSegment({ ...segment, easySeconds })}
        />
        <NumberField
          label="Rest between rounds"
          unit="s"
          value={segment.restBetweenRoundsSeconds}
          parse={parseSeconds}
          onCommit={restBetweenRoundsSeconds => onSegment({ ...segment, restBetweenRoundsSeconds })}
        />
      </div>
    </div>
  );
}

function SegmentFields({ segment, library, edits, onChange, onAddRoundsItem }: Pick<CardioSegmentCardProps, 'segment' | 'library' | 'edits' | 'onChange' | 'onAddRoundsItem'>) {
  const changeSegment = (next: CardioSegment) => onChange(edits.changeSegment(next));
  if (segment.kind === 'steady') {
    return (
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <NumberField label="Minutes" value={segment.minutes} onCommit={minutes => changeSegment({ ...segment, minutes })} />
        <IntensityField value={segment.intensity} onChange={intensity => changeSegment({ ...segment, intensity })} />
      </div>
    );
  }
  return <RoundsFields segment={segment} library={library} edits={edits} onChange={onChange} onAddItem={onAddRoundsItem} />;
}

type DropState = { isOver: boolean; canDrop: boolean; itemType: string | symbol | null };

function dropHint(itemType: string | symbol | null, segment: CardioSegment): string {
  if (itemType === CARDIO_SEGMENT) return 'Move here';
  return segment.kind === 'rounds' ? 'Add to the rounds' : 'Replace';
}

function itemCount(segment: RoundsSegment): string {
  return `${segment.items.length} ${segment.items.length === 1 ? 'exercise' : 'exercises'}`;
}

export function CardioSegmentCard(props: CardioSegmentCardProps) {
  const { cardioId, segment, position, count, library, edits, onChange, onReplaceExercise, onAddRoundsItem } = props;
  const headingId = useId();
  const kindLabel = SEGMENT_KIND_LABELS[segment.kind];
  const steadyExerciseId = segment.kind === 'steady' ? segment.exerciseId : '';
  const exerciseName = library.find(item => item.id === steadyExerciseId)?.name ?? 'Choose an exercise';
  const isRounds = segment.kind === 'rounds';
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
        return exercise.type === 'cardio' || (isRounds && exercise.tags.includes('Conditioning'));
      },
      drop: (item, monitor) => {
        if (monitor.didDrop()) return;
        if (monitor.getItemType() === CARDIO_SEGMENT) onChange(edits.moveBefore((item as CardioSegmentItem).segmentId, segment.id));
        else if (isRounds) onChange(edits.addRoundsItem(segment.id, (item as LibraryItem).exercise.id));
        else onChange(edits.replaceExercise(segment.id, (item as LibraryItem).exercise.id));
      },
      collect: monitor => ({ isOver: monitor.isOver({ shallow: true }), canDrop: monitor.canDrop(), itemType: monitor.getItemType() }),
    }),
    [cardioId, segment.id, isRounds, edits, onChange],
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
          {segment.kind === 'rounds' ? (
            <span className="text-sm text-text-secondary">{itemCount(segment)}</span>
          ) : (
            <Button variant="link" size="xs" className="h-auto min-w-0 px-0 text-sm font-medium text-text-primary" aria-label={`Replace ${exerciseName}`} onClick={onReplaceExercise}>
              <span className="truncate">{exerciseName}</span>
            </Button>
          )}
        </h5>
        {segment.kind === 'rounds' && <p className="text-sm font-medium text-text-primary tabular-nums">{`${segmentMinutes(segment)} min`}</p>}
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
        <SegmentFields segment={segment} library={library} edits={edits} onChange={onChange} onAddRoundsItem={onAddRoundsItem} />
      </div>
      {targeted && (
        <p aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-control bg-brand-secondary-soft">
          <span className="rounded-control bg-card px-3 py-1.5 text-sm font-medium text-brand-secondary shadow-raised">
            {dropHint(itemType, segment)}
          </span>
        </p>
      )}
    </article>
  );
}
