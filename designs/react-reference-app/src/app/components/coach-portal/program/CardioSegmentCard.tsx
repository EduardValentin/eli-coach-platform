import { useId, type Ref } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import type { Exercise } from '../../../context/TrainingContext';
import type { CardioIntensity, CardioSegment, CardioSession, RoundsItem, RoundsSegment } from '../../../domain/program';
import { CARDIO_INTENSITY_LABELS, SEGMENT_KIND_LABELS, segmentMinutes, type CardioEdits } from '../../../domain/programCardio';
import { RowActionsMenu } from '../../RowActionsMenu';
import { LABEL_CLASS } from '../../typography';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { cn } from '../../ui/utils';
import { counted } from '../../../utils/counted';
import { exerciseNameOf } from '../../program-view/programView';
import { DragHandle, DRAGGABLE_CARD_CLASS, draggableCardState, DropOverlay } from './dndParts';
import { ExerciseItemList } from './ExerciseItemList';
import { CountField } from './RowTextField';
import { parseWholeNumber } from './rowFields';
import { ChoiceGroup, ChoiceOption } from '../../ChoiceGroup';
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

function NumberField({ label, unit, value, parse, onCommit }: NumberFieldProps) {
  return (
    <label className="grid content-start gap-1">
      <span className={LABEL_CLASS}>{label}</span>
      <CountField className="w-20" label={label} value={value} parse={parse} suffix={unit} onCommit={onCommit} />
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
        <ChoiceGroup size="xs" aria-label="Intensity" value={value} onValueChange={next => onChange(next as CardioIntensity)}>
          {INTENSITY_OPTIONS.map(option => (
            <ChoiceOption key={option.value} value={option.value}>
              {option.label}
            </ChoiceOption>
          ))}
        </ChoiceGroup>
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
  const nameOf = (id: string) => exerciseNameOf(library.find(item => item.id === id));
  const onSegment = (next: RoundsSegment) => onChange(edits.changeSegment(next));
  const onItem = (item: RoundsItem) => onChange(edits.changeRoundsItem(segment.id, item));
  const { items } = segment;
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
        <NumberField label="Rounds" value={segment.rounds} onCommit={rounds => onSegment({ ...segment, rounds })} />
        <IntensityField value={segment.intensity} onChange={intensity => onSegment({ ...segment, intensity })} />
      </div>
      <ExerciseItemList
        label="Round exercises"
        items={items}
        nameOf={nameOf}
        actions={{
          onMoveUp: itemId => onChange(edits.moveRoundsItemUp(segment.id, itemId)),
          onMoveDown: itemId => onChange(edits.moveRoundsItemDown(segment.id, itemId)),
          onRemove: itemId => onChange(edits.removeRoundsItem(segment.id, itemId)),
        }}
      >
        {(item, name) => {
          const measure: ItemMeasure = item.workSeconds === undefined ? 'reps' : 'seconds';
          const amount = item.workSeconds ?? item.reps ?? 0;
          return (
            <>
              <CountField className="w-16" label={`${name} ${measure}`} value={amount} onCommit={next => onItem(measuredItem(item, measure, next))} />
              <div className="w-28">
                <ChoiceGroup size="xs" aria-label={`${name} measured in`} value={measure} onValueChange={next => onItem(measuredItem(item, next as ItemMeasure, amount))}>
                  {MEASURE_OPTIONS.map(option => (
                    <ChoiceOption key={option.value} value={option.value}>
                      {option.label}
                    </ChoiceOption>
                  ))}
                </ChoiceGroup>
              </div>
            </>
          );
        }}
      </ExerciseItemList>
      <Button variant="outline" size="xs" className="w-fit" onClick={onAddItem}>
        <Plus aria-hidden="true" />
        Add exercise
      </Button>
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <NumberField
          label="Easy between exercises"
          unit="s"
          value={segment.easySeconds}
          parse={parseWholeNumber}
          onCommit={easySeconds => onSegment({ ...segment, easySeconds })}
        />
        <NumberField
          label="Rest between rounds"
          unit="s"
          value={segment.restBetweenRoundsSeconds}
          parse={parseWholeNumber}
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
  return counted(segment.items.length, 'exercise');
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
      className={cn(DRAGGABLE_CARD_CLASS, 'grid gap-3 p-3', draggableCardState({ targeted, dragging: isDragging }))}
    >
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <DragHandle handleRef={drag as unknown as Ref<HTMLSpanElement>} />
        <h5 id={headingId} className="flex min-w-0 flex-1 items-center gap-2.5">
          <Badge tone="training-recovery">{kindLabel}</Badge>
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
      {targeted && <DropOverlay>{dropHint(itemType, segment)}</DropOverlay>}
    </article>
  );
}
