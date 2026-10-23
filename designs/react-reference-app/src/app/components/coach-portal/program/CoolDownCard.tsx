import { useId } from 'react';
import { Plus } from 'lucide-react';
import type { Exercise } from '../../../context/TrainingContext';
import type { Session } from '../../../domain/program';
import type { CoolDownEdits } from '../../../domain/coolDownEditing';
import { Button } from '../../ui/button';
import { Switch } from '../../ui/switch';
import { Textarea } from '../../ui/textarea';
import { exerciseNameOf } from '../../program-view/programView';
import { ExerciseItemList } from './ExerciseItemList';
import { CountField } from './RowTextField';
import { DropZone, LIBRARY_EXERCISE, type DraggedItem } from './sessionDnd';

type CoolDownCardProps = {
  session: Session;
  library: readonly Exercise[];
  edits: CoolDownEdits;
  onChange: (session: Session) => void;
  onPickStretch: () => void;
};

function acceptsStretch(dragged: DraggedItem): boolean {
  return dragged.kind === LIBRARY_EXERCISE && dragged.item.exercise.type === 'stretching';
}

export function CoolDownCard({ session, library, edits, onChange, onPickStretch }: CoolDownCardProps) {
  const noteId = useId();
  const { coolDown } = session;
  const { items } = coolDown;
  return (
    <DropZone
      rules={{ sessionId: session.id, onDrop: dragged => dragged.kind === LIBRARY_EXERCISE && onChange(edits.add(dragged.item.exercise.id)) }}
      accepts={acceptsStretch}
      className="rounded-control border border-border-subtle bg-surface-subtle p-3"
      activeClassName="ring-2 ring-primary/40"
    >
      <section className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-sm font-semibold text-text-primary">Cool-down</h4>
          <Switch aria-label="Cool-down" checked={coolDown.enabled} onCheckedChange={enabled => onChange(edits.change({ ...coolDown, enabled }))} />
        </div>
        {coolDown.enabled && (
          <>
            <div className="grid gap-1.5">
              <label htmlFor={noteId} className="text-sm font-medium text-text-primary">
                Cool-down note
              </label>
              <Textarea
                id={noteId}
                placeholder="Easy walk and a few stretches"
                value={coolDown.note}
                onChange={event => onChange(edits.change({ ...coolDown, note: event.target.value }))}
              />
            </div>
            <ExerciseItemList
              label="Stretches"
              items={items}
              nameOf={exerciseId => exerciseNameOf(library.find(other => other.id === exerciseId))}
              actions={{
                onMoveUp: itemId => onChange(edits.moveUp(itemId)),
                onMoveDown: itemId => onChange(edits.moveDown(itemId)),
                onRemove: itemId => onChange(edits.remove(itemId)),
              }}
            >
              {(item, name) => (
                <CountField className="w-16" label={`${name} seconds`} value={item.seconds} suffix="s" onCommit={seconds => onChange(edits.changeItem({ ...item, seconds }))} />
              )}
            </ExerciseItemList>
            <Button variant="ghost" size="xs" className="w-fit" onClick={onPickStretch}>
              <Plus aria-hidden="true" />
              Add stretch
            </Button>
          </>
        )}
      </section>
    </DropZone>
  );
}
