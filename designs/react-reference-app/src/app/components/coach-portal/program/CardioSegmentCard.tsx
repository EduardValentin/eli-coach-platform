import { useId, useRef, type Ref } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { ArrowDown, ArrowUp, Plus, Repeat, Trash2 } from 'lucide-react';
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
import { useEditorAnnouncer } from './editorAnnouncer';
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
  focus: SegmentFocus;
  onReplaceExercise: () => void;
  onAddRoundsItem: () => void;
};

export type SegmentFocus = { onSegment: (segmentId: string) => void; onRemoved: (segmentId: string) => void };

const INTENSITY_OPTIONS = (Object.keys(CARDIO_INTENSITY_LABELS) as CardioIntensity[]).map(value => ({ value, label: CARDIO_INTENSITY_LABELS[value] }));
const MEASURE_OPTIONS: { value: ItemMeasure; label: string }[] = [
  { value: 'reps', label: 'Reps' },
  { value: 'seconds', label: 'Sec' },
];
type NumberFieldProps = { label: string; unit?: string; value: number; parse?: (text: string) => number | null; onCommit: (value: number) => void };

function NumberField({ label, unit, value, parse, onCommit }: NumberFieldProps) {
  return (
    <div className="grid content-start gap-1">
      <span aria-hidden="true" className={LABEL_CLASS}>
        {label}
      </span>
      <CountField className="w-20" label={label} value={value} parse={parse} suffix={unit} onCommit={onCommit} />
    </div>
  );
}

function IntensityField({ value, onChange }: { value: CardioIntensity; onChange: (value: CardioIntensity) => void }) {
  const labelId = useId();
  return (
    <div className="grid content-start gap-1">
      <span id={labelId} className={LABEL_CLASS}>
        Intensity
      </span>
      <div className="w-52 max-w-full">
        <ChoiceGroup size="xs" aria-labelledby={labelId} value={value} onValueChange={next => onChange(next as CardioIntensity)}>
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
  const addButton = useRef<HTMLButtonElement>(null);
  return (
    <div className="grid gap-3">
      <fieldset className="flex min-w-0 flex-wrap items-start gap-x-4 gap-y-3">
        <legend className="sr-only">Interval settings</legend>
        <NumberField label="Rounds" value={segment.rounds} onCommit={rounds => onSegment({ ...segment, rounds })} />
        <IntensityField value={segment.intensity} onChange={intensity => onSegment({ ...segment, intensity })} />
        {items.length > 1 && (
          <NumberField
            label="Easy between exercises"
            unit="s"
            value={segment.easySeconds}
            parse={parseWholeNumber}
            onCommit={easySeconds => onSegment({ ...segment, easySeconds })}
          />
        )}
        <NumberField
          label="Rest between rounds"
          unit="s"
          value={segment.restBetweenRoundsSeconds}
          parse={parseWholeNumber}
          onCommit={restBetweenRoundsSeconds => onSegment({ ...segment, restBetweenRoundsSeconds })}
        />
      </fieldset>
      <ExerciseItemList
        emptyFocus={addButton}
        label="Interval exercises"
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
              <div className="w-28 shrink-0">
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
      <Button ref={addButton} variant="outline" size="xs" className="w-fit" onClick={onAddItem}>
        <Plus aria-hidden="true" />
        Add exercise
      </Button>
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
  return segment.kind === 'rounds' ? 'Add to the intervals' : 'Replace';
}

function itemCount(segment: RoundsSegment): string {
  return counted(segment.items.length, 'exercise');
}

type SegmentTitleProps = { segment: CardioSegment; kindLabel: string; headingId: string; exerciseName: string | null; onReplaceExercise: () => void };

function SegmentTitle({ segment, kindLabel, headingId, exerciseName, onReplaceExercise }: SegmentTitleProps) {
  if (segment.kind === 'rounds') {
    return (
      <h5 id={headingId} className="flex min-w-0 flex-1 items-center gap-2.5">
        <Badge tone="training-recovery">{kindLabel}</Badge>
        <span className="text-sm text-text-secondary">{itemCount(segment)}</span>
      </h5>
    );
  }
  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-1">
      <h5 id={headingId} className="flex min-w-0 items-center gap-2.5">
        <Badge tone="training-recovery">{kindLabel}</Badge>
        <span className="min-w-0 text-sm font-medium text-text-primary">{exerciseName ?? 'No exercise yet'}</span>
      </h5>
      <Button variant="outline" size="xs" onClick={onReplaceExercise}>
        <Repeat aria-hidden="true" />
        {exerciseName ? 'Replace' : 'Choose exercise'}
        {exerciseName && <span className="sr-only">{` ${exerciseName}`}</span>}
      </Button>
    </div>
  );
}

export function CardioSegmentCard(props: CardioSegmentCardProps) {
  const { cardioId, segment, position, count, library, edits, focus, onChange, onReplaceExercise, onAddRoundsItem } = props;
  const headingId = useId();
  const announce = useEditorAnnouncer();
  const kindLabel = SEGMENT_KIND_LABELS[segment.kind];
  const steadyExerciseId = segment.kind === 'steady' ? segment.exerciseId : '';
  const exerciseName = library.find(item => item.id === steadyExerciseId)?.name ?? null;
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

  function move(direction: 'up' | 'down') {
    onChange(direction === 'up' ? edits.moveUp(segment.id) : edits.moveDown(segment.id));
    focus.onSegment(segment.id);
    announce(`${kindLabel} segment moved ${direction}`);
  }

  function remove() {
    onChange(edits.remove(segment.id));
    focus.onRemoved(segment.id);
    announce(`${kindLabel} segment removed`);
  }

  return (
    <article
      ref={drop as unknown as Ref<HTMLElement>}
      aria-labelledby={headingId}
      data-segment-id={segment.id}
      className={cn(DRAGGABLE_CARD_CLASS, 'grid gap-3 p-3', draggableCardState({ targeted, dragging: isDragging }))}
    >
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <DragHandle handleRef={drag as unknown as Ref<HTMLSpanElement>} />
        <SegmentTitle segment={segment} kindLabel={kindLabel} headingId={headingId} exerciseName={exerciseName} onReplaceExercise={onReplaceExercise} />
        {segment.kind === 'rounds' && <p className="text-sm font-medium text-text-primary tabular-nums">{`${segmentMinutes(segment)} min`}</p>}
        <RowActionsMenu
          label={`${label} actions`}
          size="xs"
          actions={[
            { name: 'up', label: 'Move up', icon: ArrowUp, disabled: position === 1, onSelect: () => move('up') },
            { name: 'down', label: 'Move down', icon: ArrowDown, disabled: position === count, onSelect: () => move('down') },
            { name: 'remove', label: 'Remove', icon: Trash2, tone: 'destructive', onSelect: remove },
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
