import { useId, useRef, type Ref } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { ArrowDown, ArrowUp, Plus, Repeat, Trash2 } from 'lucide-react';
import type { Exercise } from '../../../context/TrainingContext';
import { formatRest, type CardioIntensity, type CardioSegment, type CardioSession, type RoundsItem, type RoundsSegment } from '../../../domain/program';
import { CARDIO_INTENSITY_LABELS, SEGMENT_KIND_LABELS, segmentMinutes, type CardioEdits } from '../../../domain/programCardio';
import { IconActionButton } from '../../IconActionButton';
import { RowActionsMenu } from '../../RowActionsMenu';
import { LABEL_CLASS } from '../../typography';
import { Button } from '../../ui/button';
import { cn } from '../../ui/utils';
import { counted } from '../../../utils/counted';
import { ExerciseNameButton } from '../../program-view/ExerciseNameButton';
import { roundsItemExerciseDetail, steadyExerciseDetail } from '../../program-view/sessionExerciseDetails';
import { IntensityValue } from '../../program-view/IntensityValue';
import { SegmentHeading } from '../../program-view/SegmentBlock';
import { EasyStep } from '../../program-view/SegmentTable';
import { DragHandle, DRAGGABLE_CARD_CLASS, draggableCardState, DropOverlay } from './dndParts';
import { ExerciseItemList } from './ExerciseItemList';
import { CountField, RowTextField } from './RowTextField';
import { parseRest, REST_PROBLEM } from './rowFields';
import { ChoiceGroup, ChoiceOption } from '../../ChoiceGroup';
import { useEditorAnnouncer } from './editorAnnouncer';
import { LIBRARY_TARGET_CLASS, useIsLibraryTarget } from './libraryTarget';
import { CARDIO_SEGMENT, LIBRARY_EXERCISE, type CardioSegmentItem, type LibraryItem } from './sessionDnd';

type ItemMeasure = 'reps' | 'seconds';

const EASY_LABEL = 'Easy after each exercise';

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
type NumberFieldProps = { label: string; value: number; onCommit: (value: number) => void };

function NumberField({ label, value, onCommit }: NumberFieldProps) {
  return (
    <div className="grid content-start gap-1">
      <span aria-hidden="true" className={LABEL_CLASS}>
        {label}
      </span>
      <CountField className="w-20" label={label} value={value} onCommit={onCommit} />
    </div>
  );
}

type RestFieldProps = { label: string; seconds: number; onCommit: (seconds: number) => void };

function RestField({ label, seconds, onCommit }: RestFieldProps) {
  return (
    <div className="grid content-start gap-1">
      <span aria-hidden="true" className={LABEL_CLASS}>
        {label}
      </span>
      <RowTextField className="w-20" label={label} value={seconds} format={formatRest} parse={parseRest} problem={REST_PROBLEM} onCommit={onCommit} />
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
      <div className="w-fit max-w-full">
        <ChoiceGroup aria-labelledby={labelId} value={value} onValueChange={next => onChange(next as CardioIntensity)}>
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
  position: number;
  library: readonly Exercise[];
  edits: CardioEdits;
  onChange: (cardio: CardioSession) => void;
  onAddItem: () => void;
};

function RoundsFields({ segment, position, library, edits, onChange, onAddItem }: RoundsFieldsProps) {
  const onSegment = (next: RoundsSegment) => onChange(edits.changeSegment(next));
  const onItem = (item: RoundsItem) => onChange(edits.changeRoundsItem(segment.id, item));
  const { items } = segment;
  const addButton = useRef<HTMLButtonElement>(null);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <fieldset className="flex min-w-0 flex-wrap items-start gap-x-4 gap-y-3">
        <legend className="sr-only">Interval settings</legend>
        <NumberField label="Rounds" value={segment.rounds} onCommit={rounds => onSegment({ ...segment, rounds })} />
        <IntensityField value={segment.intensity} onChange={intensity => onSegment({ ...segment, intensity })} />
        {items.length > 0 && (
          <RestField label={EASY_LABEL} seconds={segment.easySeconds} onCommit={easySeconds => onSegment({ ...segment, easySeconds })} />
        )}
        <RestField
          label="Rest between rounds"
          seconds={segment.restBetweenRoundsSeconds}
          onCommit={restBetweenRoundsSeconds => onSegment({ ...segment, restBetweenRoundsSeconds })}
        />
      </fieldset>
      <div className="flex items-center justify-between gap-3">
        <span className={LABEL_CLASS}>Exercises</span>
        <IconActionButton ref={addButton} icon={Plus} label="Add exercise to the intervals" hint="Add exercise" onClick={onAddItem} />
      </div>
      <ExerciseItemList
        frame="bracket"
        emptyFocus={addButton}
        label="Interval exercises"
        items={items}
        library={library}
        detailFor={(item, exercise) => roundsItemExerciseDetail(segment, item, exercise)}
        place={`segment ${position}`}
        after={() => segment.easySeconds > 0 && <EasyStep time={formatRest(segment.easySeconds)} layout="line" />}
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
              <div className="w-fit shrink-0">
                <ChoiceGroup aria-label={`${name} measured in`} value={measure} onValueChange={next => onItem(measuredItem(item, next as ItemMeasure, amount))}>
                  {MEASURE_OPTIONS.map(option => (
                    <ChoiceOption key={option.value} value={option.value}>
                      {option.label}
                    </ChoiceOption>
                  ))}
                </ChoiceGroup>
              </div>
              <span className="self-center"><IntensityValue intensity={segment.intensity} /></span>
            </>
          );
        }}
      </ExerciseItemList>
    </div>
  );
}

function SegmentFields({ segment, position, library, edits, onChange, onAddRoundsItem }: Pick<CardioSegmentCardProps, 'segment' | 'position' | 'library' | 'edits' | 'onChange' | 'onAddRoundsItem'>) {
  const changeSegment = (next: CardioSegment) => onChange(edits.changeSegment(next));
  if (segment.kind === 'steady') {
    return (
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <NumberField label="Minutes" value={segment.minutes} onCommit={minutes => changeSegment({ ...segment, minutes })} />
        <IntensityField value={segment.intensity} onChange={intensity => changeSegment({ ...segment, intensity })} />
      </div>
    );
  }
  return <RoundsFields segment={segment} position={position} library={library} edits={edits} onChange={onChange} onAddItem={onAddRoundsItem} />;
}

type DropState = { isOver: boolean; canDrop: boolean; itemType: string | symbol | null };

function dropHint(itemType: string | symbol | null, segment: CardioSegment): string {
  if (itemType === CARDIO_SEGMENT) return 'Move here';
  return segment.kind === 'rounds' ? 'Add to the intervals' : 'Replace';
}

type SegmentTitleProps = {
  segment: CardioSegment;
  position: number;
  kindLabel: string;
  headingId: string;
  exercise: Exercise | undefined;
  onReplaceExercise: () => void;
};

const KIND_CLASS = 'text-sm font-semibold text-text-primary';
const DETAIL_CLASS = 'min-w-0 text-sm font-normal text-text-secondary tabular-nums';

function ReplaceExercise({ exercise, onReplace }: { exercise: Exercise | undefined; onReplace: () => void }) {
  if (exercise) return <IconActionButton icon={Repeat} label={`Replace ${exercise.name}`} hint="Replace exercise" onClick={onReplace} />;
  return (
    <Button variant="outline" size="xs" onClick={onReplace}>
      <Repeat aria-hidden="true" />
      Choose exercise
    </Button>
  );
}

function SegmentTitle({ segment, position, kindLabel, headingId, exercise, onReplaceExercise }: SegmentTitleProps) {
  if (segment.kind === 'rounds') {
    return (
      <SegmentHeading level="h5" number={position} id={headingId}>
        <span className={KIND_CLASS}>{kindLabel}</span>
        <span className={DETAIL_CLASS}>{`${counted(segment.rounds, 'round')} · ${segmentMinutes(segment)} min`}</span>
      </SegmentHeading>
    );
  }
  return (
    <SegmentHeading level="h5" number={position} id={headingId} action={<ReplaceExercise exercise={exercise} onReplace={onReplaceExercise} />}>
      <span className={KIND_CLASS}>{kindLabel}</span>
      {exercise ? (
        <ExerciseNameButton exercise={exercise} detail={steadyExerciseDetail(segment, exercise)} weight="medium" size="compact" place={`segment ${position}`} />
      ) : (
        <span className={cn(DETAIL_CLASS, 'font-medium text-text-primary')}>No exercise yet</span>
      )}
    </SegmentHeading>
  );
}

export function CardioSegmentCard(props: CardioSegmentCardProps) {
  const { cardioId, segment, position, count, library, edits, focus, onChange, onReplaceExercise, onAddRoundsItem } = props;
  const headingId = useId();
  const announce = useEditorAnnouncer();
  const kindLabel = SEGMENT_KIND_LABELS[segment.kind];
  const steadyExerciseId = segment.kind === 'steady' ? segment.exerciseId : '';
  const steadyExercise = library.find(item => item.id === steadyExerciseId);
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
  const filling = useIsLibraryTarget({ kind: isRounds ? 'rounds-item' : 'cardio-exercise', sessionId: cardioId, segmentId: segment.id });

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
      className={cn(DRAGGABLE_CARD_CLASS, 'grid grid-cols-[minmax(0,1fr)] gap-3 p-3', draggableCardState({ targeted, dragging: isDragging }), { [LIBRARY_TARGET_CLASS]: filling })}
    >
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <DragHandle handleRef={drag as unknown as Ref<HTMLSpanElement>} />
        <SegmentTitle segment={segment} position={position} kindLabel={kindLabel} headingId={headingId} exercise={steadyExercise} onReplaceExercise={onReplaceExercise} />
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
        <SegmentFields segment={segment} position={position} library={library} edits={edits} onChange={onChange} onAddRoundsItem={onAddRoundsItem} />
      </div>
      {targeted && <DropOverlay>{dropHint(itemType, segment)}</DropOverlay>}
    </article>
  );
}
