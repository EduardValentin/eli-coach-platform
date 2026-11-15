import { useRef } from 'react';
import { Plus } from 'lucide-react';
import type { Exercise } from '../../../context/TrainingContext';
import type { Session } from '../../../domain/program';
import type { CoolDownEdits } from '../../../domain/coolDownEditing';
import { IconActionButton } from '../../IconActionButton';
import { Switch } from '../../ui/switch';
import { cn } from '../../ui/utils';
import { exerciseNameOf } from '../../program-view/programView';
import { ExerciseItemList } from './ExerciseItemList';
import { LIBRARY_TARGET_CLASS, useIsLibraryTarget } from './libraryTarget';
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
  const addButton = useRef<HTMLButtonElement>(null);
  const { coolDown } = session;
  const { items } = coolDown;
  const filling = useIsLibraryTarget({ kind: 'cool-down', sessionId: session.id });
  return (
    <DropZone
      rules={{ sessionId: session.id, onDrop: dragged => dragged.kind === LIBRARY_EXERCISE && onChange(edits.add(dragged.item.exercise.id)) }}
      accepts={acceptsStretch}
      className={cn('rounded-control border border-border-subtle bg-surface-subtle p-3', { [LIBRARY_TARGET_CLASS]: filling })}
    >
      <section className="grid grid-cols-[minmax(0,1fr)] gap-3">
        <div className="flex items-center gap-3">
          <h4 className="mr-auto text-sm font-semibold text-text-primary">Cool-down</h4>
          {coolDown.enabled && <IconActionButton ref={addButton} icon={Plus} label="Add stretch to cool-down" hint="Add stretch" onClick={onPickStretch} />}
          <Switch aria-label="Cool-down" checked={coolDown.enabled} onCheckedChange={enabled => onChange(edits.change({ ...coolDown, enabled }))} />
        </div>
        {coolDown.enabled && (
          <ExerciseItemList
            emptyFocus={addButton}
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
        )}
      </section>
    </DropZone>
  );
}
