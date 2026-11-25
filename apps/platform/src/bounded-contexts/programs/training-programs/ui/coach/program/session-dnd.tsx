import { Plus } from "lucide-react";
import type { ReactNode, Ref } from "react";
import { useDragLayer, useDrop } from "react-dnd";

import { cn } from "~/shared/design-system/lib";
import { Button } from "~/shared/design-system/primitives";

import type { LibraryExercise } from "~/bounded-contexts/programs/training-programs/public/program-editing";

import { DragPreview, InsertionLine } from "./dnd-parts";

export const LIBRARY_EXERCISE = "LIBRARY_EXERCISE";
export const PLAN_ROW = "PLAN_ROW";

export type LibraryItem = { exercise: LibraryExercise };
export type PlanRowItem = { sessionId: string; rowId: string; label: string };
export type DraggedItem =
  | { kind: typeof LIBRARY_EXERCISE; item: LibraryItem }
  | { kind: typeof PLAN_ROW; item: PlanRowItem };

export type SessionDropRules = {
  sessionId: string;
  onDrop: (dragged: DraggedItem) => void;
};

type DropState = {
  isOver: boolean;
  canDrop: boolean;
  itemType: string | symbol | null;
};

function draggedFrom(type: string | symbol | null, item: unknown): DraggedItem {
  return type === PLAN_ROW
    ? { kind: PLAN_ROW, item: item as PlanRowItem }
    : { kind: LIBRARY_EXERCISE, item: item as LibraryItem };
}

export function acceptsIntoSession(
  dragged: DraggedItem,
  sessionId: string,
): boolean {
  if (dragged.kind === PLAN_ROW) return dragged.item.sessionId === sessionId;

  return dragged.item.exercise.type === "resistance";
}

export function useSessionDrop(
  { sessionId, onDrop }: SessionDropRules,
  accepts = acceptsIntoSession,
) {
  return useDrop<LibraryItem | PlanRowItem, void, DropState>(
    () => ({
      accept: [LIBRARY_EXERCISE, PLAN_ROW],
      canDrop: (item, monitor) =>
        accepts(draggedFrom(monitor.getItemType(), item), sessionId),
      drop: (item, monitor) => {
        if (monitor.didDrop()) return;
        onDrop(draggedFrom(monitor.getItemType(), item));
      },
      collect: (monitor) => ({
        isOver: monitor.isOver({ shallow: true }),
        canDrop: monitor.canDrop(),
        itemType: monitor.getItemType(),
      }),
    }),
    [sessionId, onDrop, accepts],
  );
}

export function DropSeparator({ rules }: { rules: SessionDropRules }) {
  const [{ isOver, canDrop }, drop] = useSessionDrop(rules);

  return (
    <div
      aria-hidden="true"
      className={cn("relative", { "py-2": canDrop, "py-1": !canDrop })}
      ref={drop as unknown as Ref<HTMLDivElement>}
    >
      <InsertionLine canDrop={canDrop} isOver={isOver} />
    </div>
  );
}

type DropReadiness = "over" | "ready" | undefined;

function dropReadiness({
  isOver,
  canDrop,
}: {
  isOver: boolean;
  canDrop: boolean;
}): DropReadiness {
  if (!canDrop) return undefined;

  return isOver ? "over" : "ready";
}

type EmptyDropTargetProps = {
  rules: SessionDropRules;
  place: string;
  onAdd: () => void;
};

export function EmptyDropTarget({ rules, place, onAdd }: EmptyDropTargetProps) {
  const [state, drop] = useSessionDrop(rules);
  const readiness = dropReadiness(state);

  return (
    <div ref={drop as unknown as Ref<HTMLDivElement>}>
      <Button
        data-drop={readiness}
        data-slot-add=""
        onClick={onAdd}
        size="md"
        variant="drop"
      >
        <Plus aria-hidden="true" />
        {readiness === "over" ? "Release to add" : "Add or drop an exercise"}
        <span className="sr-only">{` in ${place}`}</span>
      </Button>
    </div>
  );
}

type DropZoneTone = "ring" | "inset" | "fill";

const DROP_ZONE_ACTIVE_CLASS: Record<DropZoneTone, string> = {
  ring: "ring-2 ring-primary/40",
  inset: "ring-2 ring-inset ring-primary/40",
  fill: "bg-primary-soft",
};

type DropZoneProps = {
  rules: SessionDropRules;
  accepts?: typeof acceptsIntoSession;
  className?: string;
  tone?: DropZoneTone;
  children: ReactNode;
};

export function DropZone({
  rules,
  accepts,
  className,
  tone = "ring",
  children,
}: DropZoneProps) {
  const [{ isOver, canDrop }, drop] = useSessionDrop(rules, accepts);

  return (
    <div
      className={cn(className, {
        [DROP_ZONE_ACTIVE_CLASS[tone]]: isOver && canDrop,
      })}
      ref={drop as unknown as Ref<HTMLDivElement>}
    >
      {children}
    </div>
  );
}

function dragLabel(
  type: string | symbol | null,
  item: LibraryItem | PlanRowItem,
): string | null {
  if (type !== LIBRARY_EXERCISE && type !== PLAN_ROW) return null;
  const dragged = draggedFrom(type, item);

  return dragged.kind === PLAN_ROW
    ? dragged.item.label
    : dragged.item.exercise.name;
}

export function SessionDragLayer() {
  const { item, type, offset } = useDragLayer((monitor) => ({
    item: monitor.getItem() as LibraryItem | PlanRowItem | null,
    type: monitor.getItemType(),
    offset: monitor.getSourceClientOffset(),
  }));
  if (!item || !offset) return null;
  const label = dragLabel(type, item);
  if (label === null) return null;

  return <DragPreview label={label} offset={offset} />;
}
