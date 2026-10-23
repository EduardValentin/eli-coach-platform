import type { ReactNode, Ref } from 'react';
import { GripVertical } from 'lucide-react';
import type { XYCoord } from 'react-dnd';
import { cn } from '../../ui/utils';

export type DropReadiness = { isOver: boolean; canDrop: boolean };

export const DRAGGABLE_CARD_CLASS = 'relative rounded-control border bg-card transition-[border-color,box-shadow,opacity] motion-reduce:transition-none';

export function draggableCardState({ targeted, dragging }: { targeted: boolean; dragging: boolean }) {
  return {
    'border-brand-secondary ring-2 ring-brand-secondary/20': targeted,
    'border-border': !targeted,
    'opacity-40': dragging,
  };
}

export function InsertionLine({ isOver, canDrop }: DropReadiness) {
  return (
    <div
      className={cn('mx-3 h-0.5 rounded-full transition-all duration-200 motion-reduce:transition-none', {
        'h-1 bg-primary': isOver && canDrop,
        'bg-border': canDrop && !isOver,
        'bg-transparent': !canDrop,
      })}
    />
  );
}

export function DragPreview({ offset, label }: { offset: XYCoord; label: string }) {
  return (
    <div className="pointer-events-none fixed top-0 left-0 z-[100]" style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}>
      <div className="inline-flex items-center gap-2 rounded-control border border-primary bg-card px-3 py-2 shadow-raised">
        <GripVertical aria-hidden="true" size={14} className="text-text-secondary" />
        <span className="text-sm font-medium text-text-primary">{label}</span>
      </div>
    </div>
  );
}

export function DragHandle({ handleRef, className }: { handleRef: Ref<HTMLSpanElement>; className?: string }) {
  return (
    <span
      ref={handleRef}
      aria-hidden="true"
      className={cn('flex h-7 shrink-0 cursor-grab touch-none items-center select-none text-text-secondary hover:text-text-primary active:cursor-grabbing', className)}
    >
      <GripVertical size={16} />
    </span>
  );
}

export function DropOverlay({ children }: { children: ReactNode }) {
  return (
    <p aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-control bg-brand-secondary-soft">
      <span className="rounded-control bg-card px-3 py-1.5 text-sm font-medium text-brand-secondary shadow-raised">{children}</span>
    </p>
  );
}
