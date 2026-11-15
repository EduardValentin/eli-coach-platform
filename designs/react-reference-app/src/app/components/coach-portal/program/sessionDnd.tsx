import type { ReactNode, Ref } from 'react';
import { useDragLayer, useDrop } from 'react-dnd';
import { Plus } from 'lucide-react';
import type { Exercise } from '../../../context/TrainingContext';
import { cn } from '../../ui/utils';
import { DragPreview, InsertionLine } from './dndParts';

export const LIBRARY_EXERCISE = 'LIBRARY_EXERCISE';
export const PLAN_ROW = 'PLAN_ROW';
export const CARDIO_SEGMENT = 'CARDIO_SEGMENT';

export type LibraryItem = { exercise: Exercise };
export type PlanRowItem = { sessionId: string; rowId: string; label: string };
export type CardioSegmentItem = { cardioId: string; segmentId: string; label: string };
export type DraggedItem = { kind: typeof LIBRARY_EXERCISE; item: LibraryItem } | { kind: typeof PLAN_ROW; item: PlanRowItem };

export type SessionDropRules = {
  sessionId: string;
  onDrop: (dragged: DraggedItem) => void;
};

type DropState = { isOver: boolean; canDrop: boolean; itemType: string | symbol | null };

function draggedFrom(type: string | symbol | null, item: unknown): DraggedItem {
  return type === PLAN_ROW ? { kind: PLAN_ROW, item: item as PlanRowItem } : { kind: LIBRARY_EXERCISE, item: item as LibraryItem };
}

export function acceptsIntoSession(dragged: DraggedItem, sessionId: string): boolean {
  if (dragged.kind === PLAN_ROW) return dragged.item.sessionId === sessionId;
  return dragged.item.exercise.type === 'resistance';
}

export function useSessionDrop({ sessionId, onDrop }: SessionDropRules, accepts = acceptsIntoSession) {
  return useDrop<LibraryItem | PlanRowItem, void, DropState>(
    () => ({
      accept: [LIBRARY_EXERCISE, PLAN_ROW],
      canDrop: (item, monitor) => accepts(draggedFrom(monitor.getItemType(), item), sessionId),
      drop: (item, monitor) => {
        if (monitor.didDrop()) return;
        onDrop(draggedFrom(monitor.getItemType(), item));
      },
      collect: monitor => ({ isOver: monitor.isOver({ shallow: true }), canDrop: monitor.canDrop(), itemType: monitor.getItemType() }),
    }),
    [sessionId, onDrop, accepts],
  );
}

export function DropSeparator({ rules }: { rules: SessionDropRules }) {
  const [{ isOver, canDrop }, drop] = useSessionDrop(rules);
  return (
    <div ref={drop as unknown as Ref<HTMLDivElement>} aria-hidden="true" className={cn('relative', { 'py-2': canDrop, 'py-1': !canDrop })}>
      <InsertionLine isOver={isOver} canDrop={canDrop} />
    </div>
  );
}

export function EmptyDropTarget({ rules, place, onAdd }: { rules: SessionDropRules; place: string; onAdd: () => void }) {
  const [{ isOver, canDrop }, drop] = useSessionDrop(rules);
  const active = isOver && canDrop;
  return (
    <div ref={drop as unknown as Ref<HTMLDivElement>}>
      <button
        type="button"
        data-slot-add=""
        onClick={onAdd}
        className={cn(
          'flex min-h-12 w-full items-center justify-center gap-2 rounded-field border border-dashed px-4 py-3 text-sm font-medium transition-colors outline-none motion-reduce:transition-none',
          {
            'border-primary bg-primary-soft text-primary': active,
            'border-primary/40 bg-primary-soft text-text-secondary': canDrop && !isOver,
            'border-control-border-soft bg-card text-text-secondary hover:border-primary hover:bg-primary-soft hover:text-primary': !canDrop,
          },
        )}
      >
        <Plus aria-hidden="true" className="size-4" />
        {active ? 'Release to add' : 'Add or drop an exercise'}
        <span className="sr-only">{` in ${place}`}</span>
      </button>
    </div>
  );
}

export function DropZone({ rules, accepts, className, activeClassName, children }: { rules: SessionDropRules; accepts?: typeof acceptsIntoSession; className?: string; activeClassName: string; children: ReactNode }) {
  const [{ isOver, canDrop }, drop] = useSessionDrop(rules, accepts);
  return (
    <div ref={drop as unknown as Ref<HTMLDivElement>} className={cn(className, { [activeClassName]: isOver && canDrop })}>
      {children}
    </div>
  );
}

function dragLabel(type: string | symbol | null, item: LibraryItem | PlanRowItem | CardioSegmentItem): string | null {
  if (type === CARDIO_SEGMENT) return (item as CardioSegmentItem).label;
  if (type !== LIBRARY_EXERCISE && type !== PLAN_ROW) return null;
  const dragged = draggedFrom(type, item);
  return dragged.kind === PLAN_ROW ? dragged.item.label : dragged.item.exercise.name;
}

export function SessionDragLayer() {
  const { item, type, offset } = useDragLayer(monitor => ({
    item: monitor.getItem() as LibraryItem | PlanRowItem | CardioSegmentItem | null,
    type: monitor.getItemType(),
    offset: monitor.getSourceClientOffset(),
  }));
  if (!item || !offset) return null;
  const label = dragLabel(type, item);
  if (label === null) return null;
  return <DragPreview offset={offset} label={label} />;
}
