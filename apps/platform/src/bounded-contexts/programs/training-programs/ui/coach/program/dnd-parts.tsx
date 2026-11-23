import { GripVertical } from "lucide-react";
import type { XYCoord } from "react-dnd";

import { cn } from "~/shared/design-system/lib";

type DropReadiness = { isOver: boolean; canDrop: boolean };

export function InsertionLine({ isOver, canDrop }: DropReadiness) {
  return (
    <div
      className={cn(
        "mx-3 h-0.5 rounded-full transition-all duration-200 motion-reduce:transition-none",
        {
          "h-1 bg-primary": isOver && canDrop,
          "bg-border-default": canDrop && !isOver,
          "bg-transparent": !canDrop,
        },
      )}
      data-parity="block-insertion-line"
    />
  );
}

export function DragPreview({
  offset,
  label,
}: {
  offset: XYCoord;
  label: string;
}) {
  return (
    <div
      className="pointer-events-none fixed top-0 left-0 z-100"
      style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
    >
      <div className="inline-flex items-center gap-2 rounded-control border border-primary bg-surface-base px-3 py-2 shadow-raised">
        <GripVertical
          aria-hidden="true"
          className="text-text-secondary"
          size={14}
        />
        <span className="text-sm font-medium text-text-primary">{label}</span>
      </div>
    </div>
  );
}
