import { Plus } from "lucide-react";
import { useRef } from "react";

import { cn } from "~/shared/design-system/lib";
import { Switch } from "~/shared/design-system/primitives";

import type {
  CoolDownEditing,
  LibraryExercise,
  Session,
} from "~/bounded-contexts/programs/training-programs/public/program-editing";
import { EditableRoutine } from "~/bounded-contexts/programs/training-programs/ui/shared/program-view/routine-list";

import { ExerciseItemList } from "./exercise-item-list";
import { IconActionButton } from "./icon-action-button";
import { LIBRARY_TARGET_CLASS, useIsLibraryTarget } from "./library-target";
import { CountField } from "./row-text-field";
import { coolDownExerciseDetail } from "./session-exercise-details";
import { DropZone, LIBRARY_EXERCISE, type DraggedItem } from "./session-dnd";

type CoolDownCardProps = {
  session: Session;
  libraryExercises: readonly LibraryExercise[];
  editing: CoolDownEditing;
  onChange: (session: Session) => void;
  onPickStretch: () => void;
};

function acceptsStretch(dragged: DraggedItem): boolean {
  return (
    dragged.kind === LIBRARY_EXERCISE &&
    dragged.item.exercise.type === "stretching"
  );
}

export function CoolDownCard({
  session,
  libraryExercises,
  editing,
  onChange,
  onPickStretch,
}: CoolDownCardProps) {
  const addButton = useRef<HTMLButtonElement>(null);
  const { coolDown } = session;
  const filling = useIsLibraryTarget({
    kind: "cool-down",
    sessionId: session.id,
  });

  return (
    <DropZone
      accepts={acceptsStretch}
      className={cn(
        "rounded-control border border-border-subtle bg-surface-subtle p-3",
        { [LIBRARY_TARGET_CLASS]: filling },
      )}
      rules={{
        sessionId: session.id,
        onDrop: (dragged) =>
          dragged.kind === LIBRARY_EXERCISE &&
          onChange(editing.add(session, dragged.item.exercise.id)),
      }}
    >
      <EditableRoutine
        action={
          <div className="flex items-center gap-3">
            {coolDown.enabled && (
              <IconActionButton
                hint="Add stretch"
                icon={Plus}
                label="Add stretch to cool-down"
                onClick={onPickStretch}
                ref={addButton}
              />
            )}
            <Switch
              aria-label="Cool-down"
              checked={coolDown.enabled}
              onCheckedChange={(enabled) =>
                onChange(
                  editing.withCoolDown(session, { ...coolDown, enabled }),
                )
              }
            />
          </div>
        }
        title="Cool-down"
      >
        <ExerciseItemList
          actions={{
            onMoveUp: (itemId) => onChange(editing.moveUp(session, itemId)),
            onMoveDown: (itemId) => onChange(editing.moveDown(session, itemId)),
            onRemove: (itemId) => onChange(editing.remove(session, itemId)),
          }}
          detailFor={coolDownExerciseDetail}
          emptyFocus={addButton}
          items={coolDown.enabled ? coolDown.items : []}
          libraryExercises={libraryExercises}
        >
          {(item, name) => (
            <CountField
              className="w-16"
              label={`${name} seconds`}
              onCommit={(seconds) =>
                onChange(editing.changeItem(session, { ...item, seconds }))
              }
              suffix="s"
              value={item.seconds}
            />
          )}
        </ExerciseItemList>
      </EditableRoutine>
    </DropZone>
  );
}
