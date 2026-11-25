import { Plus } from "lucide-react";
import { useRef, type ReactNode } from "react";

import { cn, EYEBROW_CLASS } from "~/shared/design-system/lib";
import { Button } from "~/shared/design-system/primitives";

import {
  SessionEditing,
  SINGLE_UNIT_SLOTS,
  type ExerciseRow,
  type LibraryExercise,
  type Placement,
  type Session,
  type Slot,
  type SlotPlan,
  type WeekSession,
} from "~/bounded-contexts/programs/training-programs/public/program-editing";
import { SupersetGroup } from "~/bounded-contexts/programs/training-programs/ui/shared/program-view/superset-group";

import { useEditorAnnouncer } from "./editor-announcer";
import { ExerciseCard, type RowFocus, type SlotTarget } from "./exercise-card";
import { IconActionButton } from "./icon-action-button";
import { LIBRARY_TARGET_CLASS, useIsLibraryTarget } from "./library-target";
import { MOVEMENT_PATTERN_LABELS } from "./movement-pattern-labels";
import {
  DropSeparator,
  DropZone,
  EmptyDropTarget,
  PLAN_ROW,
  type DraggedItem,
  type SessionDropRules,
} from "./session-dnd";
import { actionsTriggerIn, usePendingFocus } from "./use-pending-focus";

type SlotGroupProps = {
  session: Session;
  plan: SlotPlan;
  firstWeek: WeekSession;
  libraryExercises: readonly LibraryExercise[];
  editing: SessionEditing;
  slots: readonly SlotTarget[];
  onChange: (session: Session) => void;
  onAdd: (slot: Slot) => void;
  onAddSubstitution: (rowId: string) => void;
};

type SupersetUnitProps = {
  positions: readonly string[];
  onUngroup: () => void;
  children: ReactNode;
};

function SupersetUnit({ positions, onUngroup, children }: SupersetUnitProps) {
  const ungroup = (
    <Button onClick={onUngroup} size="xs" variant="ghost">
      Ungroup
      <span className="sr-only">{` ${positions.join(" and ")}`}</span>
    </Button>
  );

  return <SupersetGroup action={ungroup}>{children}</SupersetGroup>;
}

function exercisePatterns(
  session: Session,
  slot: Slot,
  libraryExercises: readonly LibraryExercise[],
) {
  const patterns = session.rows
    .filter((row) => row.slot === slot)
    .flatMap(
      (row) =>
        libraryExercises.find((exercise) => exercise.id === row.exerciseId)
          ?.pattern ?? [],
    );

  return [...new Set(patterns)];
}

function PatternText({
  patterns,
}: {
  patterns: ReturnType<typeof exercisePatterns>;
}) {
  if (patterns.length === 0) return null;

  return (
    <p className="text-sm text-text-secondary">
      <span className="sr-only">Patterns: </span>
      {patterns.map((pattern) => MOVEMENT_PATTERN_LABELS[pattern]).join(" · ")}
    </p>
  );
}

export function SlotGroup({
  session,
  plan,
  firstWeek,
  libraryExercises,
  editing,
  slots,
  onChange,
  onAdd,
  onAddSubstitution,
}: SlotGroupProps) {
  const announce = useEditorAnnouncer();
  const section = useRef<HTMLElement>(null);
  const focusLater = usePendingFocus();
  const focus: RowFocus = {
    onRow: (rowId) =>
      focusLater(() => actionsTriggerIn(`[data-row-id="${rowId}"]`)),
    onSlotAdd: () =>
      focusLater(() =>
        section.current?.querySelector<HTMLElement>("[data-slot-add]"),
      ),
  };
  const { slot, label } = plan;
  const filling = useIsLibraryTarget({
    kind: "slot",
    sessionId: session.id,
    slot,
  });
  const units = editing.slotUnits(session, slot);
  const heading = `${slot} · ${label}`;
  const several = !SINGLE_UNIT_SLOTS.includes(slot);
  const placeAt = (placement: Placement) => (dragged: DraggedItem) =>
    onChange(
      dragged.kind === PLAN_ROW
        ? editing.move(session, dragged.item.rowId, placement)
        : editing.add(session, dragged.item.exercise, placement),
    );
  const rulesAt = (placement: Placement): SessionDropRules => ({
    sessionId: session.id,
    onDrop: placeAt(placement),
  });

  function ungroup(group: string, rows: readonly ExerciseRow[]) {
    const positions = rows.map((row) =>
      SessionEditing.positionLabel(session, row),
    );
    onChange(editing.ungroup(session, group));
    focus.onRow(rows[0].id);
    announce(`${positions.join(" and ")} ungrouped`);
  }

  const card = (rowId: string) => {
    const row = session.rows.find((other) => other.id === rowId);
    const weekRow = firstWeek.rows.find((other) => other.id === rowId);
    if (!row || !weekRow) return null;

    return (
      <ExerciseCard
        editing={editing}
        exercise={libraryExercises.find((item) => item.id === row.exerciseId)}
        firstWeek={weekRow}
        focus={focus}
        key={row.id}
        libraryExercises={libraryExercises}
        onAddSubstitution={onAddSubstitution}
        onChange={onChange}
        row={row}
        session={session}
        slots={slots}
      />
    );
  };

  return (
    <section
      className={cn("grid grid-cols-[minmax(0,1fr)] gap-2 rounded-control", {
        [LIBRARY_TARGET_CLASS]: filling,
      })}
      ref={section}
    >
      <header className="flex items-start gap-3">
        <div className="flex min-h-(--size-control-xs) min-w-0 flex-1 flex-wrap content-center items-center gap-x-3 gap-y-2">
          <h4 className={EYEBROW_CLASS}>{heading}</h4>
          <PatternText
            patterns={exercisePatterns(session, slot, libraryExercises)}
          />
        </div>
        {several && units.length > 0 && (
          <IconActionButton
            data-slot-add=""
            hint="Add exercise"
            icon={Plus}
            label={`Add exercise to ${heading}`}
            onClick={() => onAdd(slot)}
          />
        )}
      </header>
      <DropZone
        className="rounded-control"
        rules={rulesAt({ slot })}
        tone="fill"
      >
        {units.length === 0 ? (
          <EmptyDropTarget
            onAdd={() => onAdd(slot)}
            place={heading}
            rules={rulesAt({ slot })}
          />
        ) : (
          <div className="grid grid-cols-[minmax(0,1fr)]">
            {several && (
              <DropSeparator
                rules={rulesAt({ slot, beforeRowId: units[0].rows[0].id })}
              />
            )}
            {units.map((unit, index) => {
              const next = units[index + 1];
              const { group } = unit;

              return (
                <div className="grid grid-cols-[minmax(0,1fr)]" key={unit.key}>
                  {group === undefined ? (
                    card(unit.rows[0].id)
                  ) : (
                    <SupersetUnit
                      onUngroup={() => ungroup(group, unit.rows)}
                      positions={unit.rows.map((row) =>
                        SessionEditing.positionLabel(session, row),
                      )}
                    >
                      {unit.rows.map((row) => (
                        <li key={row.id}>{card(row.id)}</li>
                      ))}
                    </SupersetUnit>
                  )}
                  {several && (
                    <DropSeparator
                      rules={rulesAt({
                        slot,
                        beforeRowId: next?.rows[0].id,
                      })}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </DropZone>
    </section>
  );
}
