import { useRef } from 'react';
import { Plus } from 'lucide-react';
import type { Exercise } from '../../../context/TrainingContext';
import type { Session } from '../../../domain/program';
import type { CoolDownEdits } from '../../../domain/coolDownEditing';
import { IconActionButton } from '../../IconActionButton';
import { Switch } from '../../ui/switch';
import { cn } from '../../ui/utils';
import { EditableRoutine } from '../../program-view/RoutineList';
import { coolDownExerciseDetail } from '../../program-view/sessionExerciseDetails';
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
  const filling = useIsLibraryTarget({ kind: 'cool-down', sessionId: session.id });
  return (
    <DropZone
      rules={{ sessionId: session.id, onDrop: dragged => dragged.kind === LIBRARY_EXERCISE && onChange(edits.add(dragged.item.exercise.id)) }}
      accepts={acceptsStretch}
      className={cn('rounded-control border border-border-subtle bg-surface-subtle p-3', { [LIBRARY_TARGET_CLASS]: filling })}
    >
      <EditableRoutine
        title="Cool-down"
        action={
          <div className="flex items-center gap-3">
            {coolDown.enabled && <IconActionButton ref={addButton} icon={Plus} label="Add stretch to cool-down" hint="Add stretch" onClick={onPickStretch} />}
            <Switch aria-label="Cool-down" checked={coolDown.enabled} onCheckedChange={enabled => onChange(edits.change({ ...coolDown, enabled }))} />
          </div>
        }
      >
        <ExerciseItemList
          frame="plain"
          items={coolDown.enabled ? coolDown.items : []}
          library={library}
          detailFor={coolDownExerciseDetail}
          emptyFocus={addButton}
          actions={{
            onMoveUp: itemId => onChange(edits.moveUp(itemId)),
            onMoveDown: itemId => onChange(edits.moveDown(itemId)),
            onRemove: itemId => onChange(edits.remove(itemId)),
          }}
        >
          {(item, name) => <CountField className="w-16" label={`${name} seconds`} value={item.seconds} suffix="s" onCommit={seconds => onChange(edits.changeItem({ ...item, seconds }))} />}
        </ExerciseItemList>
      </EditableRoutine>
    </DropZone>
  );
}
