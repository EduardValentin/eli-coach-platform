import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import { RowActionsMenu } from '../../RowActionsMenu';

type ExerciseItemRowProps = {
  name: string;
  position: number;
  count: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  children: ReactNode;
};

export function ExerciseItemRow({ name, position, count, onMoveUp, onMoveDown, onRemove, children }: ExerciseItemRowProps) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2">
      <span className="min-w-0 flex-1 basis-36 text-sm font-medium text-text-primary">{name}</span>
      <div className="flex flex-wrap items-start gap-2">{children}</div>
      <RowActionsMenu
        label={`${name} actions`}
        size="xs"
        actions={[
          { name: 'up', label: 'Move up', icon: ArrowUp, disabled: position === 1, onSelect: onMoveUp },
          { name: 'down', label: 'Move down', icon: ArrowDown, disabled: position === count, onSelect: onMoveDown },
          { name: 'remove', label: 'Remove', icon: Trash2, tone: 'destructive', onSelect: onRemove },
        ]}
      />
    </li>
  );
}

export const ITEM_LIST_CLASS = 'grid divide-y divide-border-subtle rounded-field border border-border-subtle bg-surface-base';
