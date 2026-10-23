import { Plus } from 'lucide-react';
import type { Exercise } from '../../../context/TrainingContext';
import { formatRange, type Session, type WarmUpItem } from '../../../domain/program';
import { WARM_UP_REPS, WARM_UP_SECONDS, type WarmUpEdits } from '../../../domain/warmUpEditing';
import { exerciseNameOf } from '../../program-view/programView';
import { Button } from '../../ui/button';
import { ExerciseItemList } from './ExerciseItemList';
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
  const exerciseOf = (exerciseId: string) => library.find(other => other.id === exerciseId);
  return (
    <DropZone
      rules={{ sessionId: session.id, onDrop: dragged => dragged.kind === LIBRARY_EXERCISE && onChange(edits.add(dragged.item.exercise.id)) }}
      accepts={acceptsLibraryExercise}
      className="rounded-control border border-border-subtle bg-surface-subtle p-3"
      activeClassName="ring-2 ring-primary/40"
    >
      <section className="grid gap-2">
        <h4 className="text-sm font-semibold text-text-primary">Warm-up</h4>
        <ExerciseItemList
          label="Warm-up exercises"
          items={session.warmUp.items}
          nameOf={exerciseId => exerciseNameOf(exerciseOf(exerciseId))}
          actions={{
            onMoveUp: itemId => onChange(edits.moveUp(itemId)),
            onMoveDown: itemId => onChange(edits.moveDown(itemId)),
            onRemove: itemId => onChange(edits.remove(itemId)),
          }}
        >
          {(item, name) => (
            <>
              <CountField className="w-14" label={`${name} sets`} value={item.sets} suffix="sets ×" onCommit={sets => onChange(edits.changeItem({ ...item, sets }))} />
              <AmountField item={item} exercise={exerciseOf(item.exerciseId)} name={name} onChange={next => onChange(edits.changeItem(next))} />
            </>
          )}
        </ExerciseItemList>
        <Button variant="ghost" size="xs" className="w-fit" onClick={onPickExercise}>
          <Plus aria-hidden="true" />
          Add warm-up exercise
        </Button>
      </section>
    </DropZone>
  );
}
