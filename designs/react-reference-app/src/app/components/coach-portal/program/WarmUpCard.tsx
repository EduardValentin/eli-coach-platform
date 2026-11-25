import { useRef } from 'react';
import { Plus } from 'lucide-react';
import type { Exercise } from '../../../context/TrainingContext';
import { formatRange, type Session, type WarmUpItem } from '../../../domain/program';
import { WARM_UP_REPS, WARM_UP_SECONDS, type WarmUpEdits } from '../../../domain/warmUpEditing';
import { EditableRoutine } from '../../program-view/RoutineList';
import { warmUpExerciseDetail } from '../../program-view/sessionExerciseDetails';
import { IconActionButton } from '../../IconActionButton';
import { cn } from '../../ui/utils';
import { ExerciseItemList } from './ExerciseItemList';
import { LIBRARY_TARGET_CLASS, useIsLibraryTarget } from './libraryTarget';
import { CountField, RowTextField } from './RowTextField';
import { parseRange, RANGE_PROBLEM } from './rowFields';
import { DropZone, LIBRARY_EXERCISE, type DraggedItem } from './sessionDnd';

type WarmUpCardProps = {
  session: Session;
  library: readonly Exercise[];
  edits: WarmUpEdits;
  onChange: (session: Session) => void;
  onPickExercise: () => void;
};

function acceptsLibraryExercise(dragged: DraggedItem): boolean {
  return dragged.kind === LIBRARY_EXERCISE;
}

function AmountField({ item, exercise, name, onChange }: { item: WarmUpItem; exercise: Exercise | undefined; name: string; onChange: (item: WarmUpItem) => void }) {
  const base = { id: item.id, exerciseId: item.exerciseId, sets: item.sets };
  if (exercise?.measuredIn === 'time') {
    return <CountField className="w-16" label={`${name} seconds`} value={item.seconds ?? WARM_UP_SECONDS} suffix="s" onCommit={seconds => onChange({ ...base, seconds })} />;
  }
  return (
    <RowTextField
      className="w-16"
      label={`${name} reps`}
      value={item.reps ?? WARM_UP_REPS}
      format={formatRange}
      parse={parseRange}
      problem={RANGE_PROBLEM}
      suffix="reps"
      onCommit={reps => onChange({ ...base, reps })}
    />
  );
}

export function WarmUpCard({ session, library, edits, onChange, onPickExercise }: WarmUpCardProps) {
  const addButton = useRef<HTMLButtonElement>(null);
  const filling = useIsLibraryTarget({ kind: 'warm-up', sessionId: session.id });
  return (
    <DropZone
      parityRoot="WarmUpCard"
      rules={{ sessionId: session.id, onDrop: dragged => dragged.kind === LIBRARY_EXERCISE && onChange(edits.add(dragged.item.exercise.id)) }}
      accepts={acceptsLibraryExercise}
      className={cn('rounded-control border border-border-subtle bg-surface-subtle p-3', { [LIBRARY_TARGET_CLASS]: filling })}
    >
      <EditableRoutine title="Warm-up" action={<IconActionButton ref={addButton} icon={Plus} label="Add exercise to warm-up" hint="Add exercise" onClick={onPickExercise} />}>
        <ExerciseItemList
          frame="plain"
          items={session.warmUp.items}
          library={library}
          detailFor={warmUpExerciseDetail}
          emptyFocus={addButton}
          actions={{
            onMoveUp: itemId => onChange(edits.moveUp(itemId)),
            onMoveDown: itemId => onChange(edits.moveDown(itemId)),
            onRemove: itemId => onChange(edits.remove(itemId)),
          }}
        >
          {(item, name, exercise) => (
            <>
              <CountField className="w-14" label={`${name} sets`} value={item.sets} suffix={item.sets === 1 ? 'set ×' : 'sets ×'} onCommit={sets => onChange(edits.changeItem({ ...item, sets }))} />
              <AmountField item={item} exercise={exercise} name={name} onChange={next => onChange(edits.changeItem(next))} />
            </>
          )}
        </ExerciseItemList>
      </EditableRoutine>
    </DropZone>
  );
}
