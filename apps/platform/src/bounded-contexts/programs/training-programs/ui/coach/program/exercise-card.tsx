import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  CornerDownRight,
  Link2,
  Trash2,
} from "lucide-react";
import type { Ref } from "react";
import { useDrag } from "react-dnd";

import { cn } from "~/shared/design-system/lib";
import {
  Button,
  RowActionsMenu,
  type RowMenuAction,
} from "~/shared/design-system/primitives";

import {
  SessionEditing,
  SINGLE_UNIT_SLOTS,
  type ExerciseRow,
  type LibraryExercise,
  type Session,
  type Slot,
  type WeekRow,
} from "~/bounded-contexts/programs/training-programs/public/program-editing";
import { ExerciseNameButton } from "~/bounded-contexts/programs/training-programs/ui/shared/program-view/exercise-name-button";
import { PositionBadge } from "~/bounded-contexts/programs/training-programs/ui/shared/program-view/position-badge";
import {
  exerciseNameOf,
  musclesAndEquipmentText,
  repsSuffix,
} from "~/bounded-contexts/programs/training-programs/ui/shared/program-view/program-view";
import { rowTargets } from "~/bounded-contexts/programs/training-programs/ui/shared/program-view/targets";
import { TargetsSummary } from "~/bounded-contexts/programs/training-programs/ui/shared/program-view/targets-summary";
import {
  DisclosureContent,
  DisclosureTrigger,
  TextDisclosureGroup,
} from "~/bounded-contexts/programs/training-programs/ui/shared/program-view/text-disclosure";

import {
  DragHandle,
  DRAGGABLE_CARD_CLASS,
  draggableCardState,
  DropOverlay,
} from "./dnd-parts";
import { useEditorAnnouncer } from "./editor-announcer";
import { ExerciseRowDetails } from "./exercise-row-details";
import {
  acceptsIntoSession,
  LIBRARY_EXERCISE,
  PLAN_ROW,
  useSessionDrop,
  type DraggedItem,
  type PlanRowItem,
} from "./session-dnd";
import { rowExerciseDetail } from "./session-exercise-details";

export type SlotTarget = { slot: Slot; label: string };
export type RowFocus = {
  onRow: (rowId: string) => void;
  onSlotAdd: () => void;
};

type ExerciseCardProps = {
  session: Session;
  row: ExerciseRow;
  firstWeekRow: WeekRow;
  exercise: LibraryExercise | undefined;
  libraryExercises: readonly LibraryExercise[];
  editing: SessionEditing;
  slots: readonly SlotTarget[];
  focus: RowFocus;
  onChange: (session: Session) => void;
  onAddSubstitution: (rowId: string) => void;
};

type MenuContext = Pick<
  ExerciseCardProps,
  | "session"
  | "row"
  | "libraryExercises"
  | "editing"
  | "slots"
  | "focus"
  | "onChange"
> & { name: string; announce: (message: string) => void };

function groupingActions({
  session,
  row,
  libraryExercises,
  editing,
  focus,
  onChange,
  name,
  announce,
}: MenuContext): RowMenuAction[] {
  if (SINGLE_UNIT_SLOTS.includes(row.slot)) return [];
  const { rows } = session;
  const next = rows[rows.findIndex((other) => other.id === row.id) + 1];
  const nextName = exerciseNameOf(
    libraryExercises.find((item) => item.id === next?.exerciseId),
  );

  return [
    {
      name: "superset",
      label: "Superset with next",
      icon: Link2,
      disabled: !editing.canSupersetWithNext(session, row.id),
      onSelect: () => {
        onChange(editing.supersetWithNext(session, row.id));
        focus.onRow(row.id);
        announce(`${name} and ${nextName} grouped as a superset`);
      },
    },
  ];
}

function moveToSlotActions({
  session,
  row,
  editing,
  slots,
  focus,
  onChange,
  name,
  announce,
}: MenuContext): RowMenuAction[] {
  const canTakeRow = (target: SlotTarget) =>
    target.slot !== row.slot &&
    !(
      SINGLE_UNIT_SLOTS.includes(target.slot) &&
      session.rows.some((other) => other.slot === target.slot)
    );

  return slots.filter(canTakeRow).map((target) => ({
    name: `move-to-${target.slot}`,
    label: `Move to ${target.slot} · ${target.label}`,
    icon: CornerDownRight,
    onSelect: () => {
      onChange(editing.move(session, row.id, { slot: target.slot }));
      focus.onRow(row.id);
      announce(`${name} moved to ${target.slot} · ${target.label}`);
    },
  }));
}

function menuActions(context: MenuContext): RowMenuAction[] {
  const { session, row, editing, focus, onChange, name, announce } = context;
  const slotRows = session.rows.filter((other) => other.slot === row.slot);
  const index = slotRows.findIndex((other) => other.id === row.id);
  const move = (direction: "up" | "down") => {
    onChange(
      direction === "up"
        ? editing.moveUp(session, row.id)
        : editing.moveDown(session, row.id),
    );
    focus.onRow(row.id);
    announce(`${name} moved ${direction}`);
  };
  const remove = () => {
    const neighbour = slotRows[index + 1] ?? slotRows[index - 1];
    onChange(editing.remove(session, row.id));
    if (neighbour) focus.onRow(neighbour.id);
    else focus.onSlotAdd();
    announce(`${name} removed`);
  };

  return [
    {
      name: "up",
      label: "Move up",
      icon: ArrowUp,
      disabled: index === 0,
      onSelect: () => move("up"),
    },
    {
      name: "down",
      label: "Move down",
      icon: ArrowDown,
      disabled: index === slotRows.length - 1,
      onSelect: () => move("down"),
    },
    ...moveToSlotActions(context),
    ...groupingActions(context),
    {
      name: "remove",
      label: "Remove",
      icon: Trash2,
      tone: "destructive",
      onSelect: remove,
    },
  ];
}

function dropHint(row: ExerciseRow, itemType: string | symbol | null): string {
  if (!SINGLE_UNIT_SLOTS.includes(row.slot)) return "Superset";

  return itemType === PLAN_ROW ? "Swap" : "Add to the next group";
}

const CARD_GRID_CLASS = cn(
  "grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-4 px-3",
  '[grid-template-areas:"handle_info_menu"_"._stats_stats"_"._toggles_toggles"_"panel_panel_panel"]',
  "sm:grid-cols-[auto_minmax(0,1fr)_auto_auto]",
  'sm:[grid-template-areas:"handle_info_toggles_menu"_"._stats_stats_stats"_"panel_panel_panel_panel"]',
);

export function ExerciseCard({
  session,
  row,
  firstWeekRow,
  exercise,
  libraryExercises,
  editing,
  slots,
  focus,
  onChange,
  onAddSubstitution,
}: ExerciseCardProps) {
  const announce = useEditorAnnouncer();
  const position = SessionEditing.positionLabel(session, row);
  const name = exerciseNameOf(exercise);
  const facts = musclesAndEquipmentText(exercise);
  const detail = rowExerciseDetail({
    session,
    row: firstWeekRow,
    progression: row.progression.kind === "custom" ? row.progression.text : "",
    findExercise: (id) => libraryExercises.find((item) => item.id === id),
  });

  const [{ isDragging }, drag] = useDrag<
    PlanRowItem,
    void,
    { isDragging: boolean }
  >(
    () => ({
      type: PLAN_ROW,
      item: {
        sessionId: session.id,
        rowId: row.id,
        label: `${position} ${name}`,
      },
      collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    }),
    [session.id, row.id, position, name],
  );

  const [{ isOver, canDrop, itemType }, drop] = useSessionDrop(
    {
      sessionId: session.id,
      onDrop: (dragged) => {
        if (dragged.kind === PLAN_ROW) {
          onChange(editing.supersetOnto(session, dragged.item.rowId, row.id));
        } else {
          onChange(editing.addOnto(session, dragged.item.exercise, row.id));
        }
      },
    },
    (dragged: DraggedItem, sessionId: string) =>
      acceptsIntoSession(dragged, sessionId) &&
      !(dragged.kind === PLAN_ROW && dragged.item.rowId === row.id),
  );
  const targeted = isOver && canDrop;

  return (
    <article
      data-parity-root="ExerciseCard"
      aria-label={`${position} ${name}`}
      className={cn(
        DRAGGABLE_CARD_CLASS,
        draggableCardState({ targeted, dragging: isDragging }),
      )}
      data-row-id={row.id}
      ref={drop as unknown as Ref<HTMLElement>}
    >
      <TextDisclosureGroup>
        <div className={CARD_GRID_CLASS}>
          <DragHandle
            className="mt-3.5 [grid-area:handle]"
            handleRef={drag as unknown as Ref<HTMLSpanElement>}
          />
          <div className="mt-3 grid min-w-0 gap-1 [grid-area:info]">
            <h5 className="flex items-center gap-2.5">
              <PositionBadge label={position} />{" "}
              <ExerciseNameButton
                detail={detail}
                exercise={exercise}
                size="compact"
                weight="medium"
              />
            </h5>
            {facts && (
              <p className="pl-9.5 text-sm text-text-secondary">{facts}</p>
            )}
          </div>
          <TargetsSummary
            className="mt-2 ml-9.5 [grid-area:stats] sm:mb-3"
            items={rowTargets(firstWeekRow, repsSuffix(exercise))}
            size="sm"
          />
          <div className="mt-2 mb-3 flex flex-wrap gap-x-1 gap-y-4 [grid-area:toggles] sm:mt-3 sm:mb-0">
            <DisclosureTrigger value="details">
              <Button
                data-panel-trigger="details"
                size="xs"
                variant="disclosure"
              >
                Details
                <span className="sr-only">{` for ${name}`}</span>
                <ChevronDown aria-hidden="true" className="size-4" />
              </Button>
            </DisclosureTrigger>
          </div>
          <div className="mt-3 [grid-area:menu]">
            <RowActionsMenu
              actions={menuActions({
                session,
                row,
                libraryExercises,
                editing,
                slots,
                focus,
                onChange,
                name,
                announce,
              })}
              label={`${name} actions`}
              size="xs"
            />
          </div>
          <DisclosureContent value="details">
            <div
              className="-mx-3 grid grid-cols-[minmax(0,1fr)] gap-4 rounded-b-[calc(var(--radius-control)-1px)] border-t border-border-subtle bg-surface-subtle px-3 py-4 [grid-area:panel]"
              data-panel="details"
            >
              <ExerciseRowDetails
                detail={detail}
                exercise={exercise}
                libraryExercises={libraryExercises}
                onAddSubstitution={() => onAddSubstitution(row.id)}
                onChange={(next) => onChange(editing.replaceRow(session, next))}
                onRemoveSubstitution={(exerciseId) =>
                  onChange(
                    editing.removeSubstitution(session, row.id, exerciseId),
                  )
                }
                onSuggestSubstitutions={() =>
                  onChange(editing.suggestSubstitutions(session, row.id))
                }
                row={row}
                substitutionDrop={{
                  sessionId: session.id,
                  onDrop: (dragged) =>
                    dragged.kind === LIBRARY_EXERCISE &&
                    onChange(
                      editing.addSubstitution(
                        session,
                        row.id,
                        dragged.item.exercise.id,
                      ),
                    ),
                }}
              />
            </div>
          </DisclosureContent>
        </div>
      </TextDisclosureGroup>
      {targeted && <DropOverlay>{dropHint(row, itemType)}</DropOverlay>}
    </article>
  );
}
