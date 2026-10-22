import { Plus } from 'lucide-react';
import type { Exercise } from '../../../context/TrainingContext';
import { formatRange, type Session, type WarmUpItem } from '../../../domain/program';
import type { SessionEdits } from '../../../domain/sessionEditing';
import { Button } from '../../ui/button';
import { ExerciseItemRow, ITEM_LIST_CLASS } from './ExerciseItemRow';
import { RowTextField } from './RowTextField';
import { COUNT_PROBLEM, parseCount, parseRange, RANGE_PROBLEM } from './rowFields';
import { DropZone, LIBRARY_EXERCISE, type DraggedItem } from './sessionDnd';

type WarmUpCardProps = {
  session: Session;
  library: readonly Exercise[];
  edits: SessionEdits;
  onChange: (session: Session) => void;
  onPickExercise: () => void;
};

const WARM_UP_REPS = { min: 10, max: 10 };
const WARM_UP_SECONDS = 45;

function acceptsLibraryExercise(dragged: DraggedItem): boolean {
  return dragged.kind === LIBRARY_EXERCISE;
}

function AmountField({ item, exercise, name, onChange }: { item: WarmUpItem; exercise: Exercise | undefined; name: string; onChange: (item: WarmUpItem) => void }) {
  const base = { id: item.id, exerciseId: item.exerciseId, sets: item.sets };
  if (exercise?.measuredIn === 'time') {
    return (
      <RowTextField
        className="w-16"
        type="number"
        label={`${name} seconds`}
        value={item.seconds ?? WARM_UP_SECONDS}
        format={String}
        parse={parseCount}
        problem={COUNT_PROBLEM}
        suffix="s"
        onCommit={seconds => onChange({ ...base, seconds })}
      />
    );
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
  const { items } = session.warmUp;
  return (
    <DropZone
      rules={{ sessionId: session.id, onDrop: dragged => dragged.kind === LIBRARY_EXERCISE && onChange(edits.addWarmUpItem(dragged.item.exercise.id)) }}
      accepts={acceptsLibraryExercise}
      className="rounded-control border border-border-subtle bg-surface-subtle p-3"
      activeClassName="ring-2 ring-primary/40"
    >
      <section className="grid gap-2">
        <h4 className="text-sm font-semibold text-text-primary">Warm-up</h4>
        {items.length > 0 && (
          <ol aria-label="Warm-up exercises" className={ITEM_LIST_CLASS}>
            {items.map((item, index) => {
              const exercise = library.find(other => other.id === item.exerciseId);
              const name = exercise?.name ?? 'Unknown exercise';
              return (
                <ExerciseItemRow
                  key={item.id}
                  name={name}
                  position={index + 1}
                  count={items.length}
                  onMoveUp={() => onChange(edits.moveWarmUpItemUp(item.id))}
                  onMoveDown={() => onChange(edits.moveWarmUpItemDown(item.id))}
                  onRemove={() => onChange(edits.removeWarmUpItem(item.id))}
                >
                  <RowTextField
                    className="w-14"
                    type="number"
                    label={`${name} sets`}
                    value={item.sets}
                    format={String}
                    parse={parseCount}
                    problem={COUNT_PROBLEM}
                    suffix="sets ×"
                    onCommit={sets => onChange(edits.changeWarmUpItem({ ...item, sets }))}
                  />
                  <AmountField item={item} exercise={exercise} name={name} onChange={next => onChange(edits.changeWarmUpItem(next))} />
                </ExerciseItemRow>
              );
            })}
          </ol>
        )}
        <Button variant="ghost" size="xs" className="w-fit" onClick={onPickExercise}>
          <Plus aria-hidden="true" />
          Add warm-up exercise
        </Button>
      </section>
    </DropZone>
  );
}
