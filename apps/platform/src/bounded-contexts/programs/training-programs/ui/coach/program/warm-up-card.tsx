import { Plus } from "lucide-react";
import { useRef } from "react";

import { cn } from "~/shared/design-system/lib";

import {
  WARM_UP_REPS,
  WARM_UP_SECONDS,
  type LibraryExercise,
  type Session,
  type WarmUpEditing,
  type WarmUpItem,
} from "~/bounded-contexts/programs/training-programs/public/program-editing";
import { formatRange } from "~/bounded-contexts/programs/training-programs/ui/shared/program-view/program-view";
import { EditableRoutine } from "~/bounded-contexts/programs/training-programs/ui/shared/program-view/routine-list";

import { ExerciseItemList } from "./exercise-item-list";
import { IconActionButton } from "./icon-action-button";
import { LIBRARY_TARGET_CLASS, useIsLibraryTarget } from "./library-target";
import { RANGE_PROBLEM, parseRange } from "./row-fields";
import { CountField, RowTextField } from "./row-text-field";
import { warmUpExerciseDetail } from "./session-exercise-details";
import { DropZone, LIBRARY_EXERCISE, type DraggedItem } from "./session-dnd";

type WarmUpCardProps = {
  session: Session;
  libraryExercises: readonly LibraryExercise[];
  editing: WarmUpEditing;
  onChange: (session: Session) => void;
  onPickExercise: () => void;
};

type AmountFieldProps = {
  item: WarmUpItem;
  exercise: LibraryExercise | undefined;
  name: string;
  onChange: (item: WarmUpItem) => void;
};

function acceptsLibraryExercise(dragged: DraggedItem): boolean {
  return dragged.kind === LIBRARY_EXERCISE;
}

function AmountField({ item, exercise, name, onChange }: AmountFieldProps) {
  const base = { id: item.id, exerciseId: item.exerciseId, sets: item.sets };
  if (exercise?.unit === "time") {
    return (
      <CountField
        className="w-16"
        label={`${name} seconds`}
        onCommit={(seconds) => onChange({ ...base, seconds })}
        suffix="s"
        value={item.seconds ?? WARM_UP_SECONDS}
      />
    );
  }

  return (
    <RowTextField
      className="w-16"
      format={formatRange}
      label={`${name} reps`}
      onCommit={(reps) => onChange({ ...base, reps })}
      parse={parseRange}
      problem={RANGE_PROBLEM}
      suffix="reps"
      value={item.reps ?? WARM_UP_REPS}
    />
  );
}

export function WarmUpCard({
  session,
  libraryExercises,
  editing,
  onChange,
  onPickExercise,
}: WarmUpCardProps) {
  const addButton = useRef<HTMLButtonElement>(null);
  const filling = useIsLibraryTarget({
    kind: "warm-up",
    sessionId: session.id,
  });

  return (
    <DropZone
      accepts={acceptsLibraryExercise}
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
          <IconActionButton
            hint="Add exercise"
            icon={Plus}
            label="Add exercise to warm-up"
            onClick={onPickExercise}
            ref={addButton}
          />
        }
        title="Warm-up"
      >
        <ExerciseItemList
          actions={{
            onMoveUp: (itemId) => onChange(editing.moveUp(session, itemId)),
            onMoveDown: (itemId) => onChange(editing.moveDown(session, itemId)),
            onRemove: (itemId) => onChange(editing.remove(session, itemId)),
          }}
          detailFor={warmUpExerciseDetail}
          emptyFocus={addButton}
          items={session.warmUp.items}
          libraryExercises={libraryExercises}
        >
          {(item, name, exercise) => (
            <>
              <CountField
                className="w-14"
                label={`${name} sets`}
                onCommit={(sets) =>
                  onChange(editing.changeItem(session, { ...item, sets }))
                }
                suffix={item.sets === 1 ? "set ×" : "sets ×"}
                value={item.sets}
              />
              <AmountField
                exercise={exercise}
                item={item}
                name={name}
                onChange={(next) => onChange(editing.changeItem(session, next))}
              />
            </>
          )}
        </ExerciseItemList>
      </EditableRoutine>
    </DropZone>
  );
}
