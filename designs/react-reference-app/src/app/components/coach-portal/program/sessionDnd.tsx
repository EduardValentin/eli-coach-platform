import type { ReactNode, Ref } from 'react';
import { useDragLayer, useDrop } from 'react-dnd';
import { GripVertical, Plus } from 'lucide-react';
import type { Exercise } from '../../../context/TrainingContext';
import { Button } from '../../ui/button';
import { cn } from '../../ui/utils';

export const LIBRARY_EXERCISE = 'LIBRARY_EXERCISE';
export const PLAN_ROW = 'PLAN_ROW';

export type LibraryItem = { exercise: Exercise };
export type PlanRowItem = { sessionId: string; rowId: string; label: string };
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
      <div
        className={cn('mx-3 h-0.5 rounded-full transition-all duration-200 motion-reduce:transition-none', {
          'h-1 bg-primary': isOver && canDrop,
          'bg-border': canDrop && !isOver,
          'bg-transparent': !canDrop,
        })}
      />
    </div>
  );
}

export function EmptyDropTarget({ rules, addLabel, onAdd }: { rules: SessionDropRules; addLabel: string; onAdd: () => void }) {
  const [{ isOver, canDrop }, drop] = useSessionDrop(rules);
  const active = isOver && canDrop;
  return (
    <div
      ref={drop as unknown as Ref<HTMLDivElement>}
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 rounded-field border border-dashed px-4 py-3 transition-colors motion-reduce:transition-none',
        {
          'border-primary bg-primary-soft text-primary': active,
          'border-primary/40 bg-primary-soft text-text-secondary': canDrop && !isOver,
          'border-border bg-surface-subtle text-text-secondary': !canDrop,
        },
      )}
    >
      <p className="text-sm">{active ? 'Release to add' : 'Drop an exercise here'}</p>
      <Button variant="outline" size="xs" aria-label={addLabel} onClick={onAdd}>
        <Plus aria-hidden="true" />
        Add
      </Button>
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

export function SessionDragLayer() {
  const { item, type, offset } = useDragLayer(monitor => ({
    item: monitor.getItem() as LibraryItem | PlanRowItem | null,
    type: monitor.getItemType(),
    offset: monitor.getSourceClientOffset(),
  }));
  if (!item || !offset || (type !== LIBRARY_EXERCISE && type !== PLAN_ROW)) return null;
  const dragged = draggedFrom(type, item);
  const label = dragged.kind === PLAN_ROW ? dragged.item.label : dragged.item.exercise.name;
  return (
    <div className="pointer-events-none fixed top-0 left-0 z-[100]" style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}>
      <div className="inline-flex items-center gap-2 rounded-control border border-primary bg-card px-3 py-2 shadow-raised">
        <GripVertical aria-hidden="true" size={14} className="text-text-secondary" />
        <span className="text-sm font-medium text-text-primary">{label}</span>
      </div>
    </div>
  );
}
