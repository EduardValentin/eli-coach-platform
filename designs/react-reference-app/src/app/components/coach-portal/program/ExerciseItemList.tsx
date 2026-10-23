import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import { RowActionsMenu } from '../../RowActionsMenu';

type ListedExercise = { id: string; exerciseId: string };
export type ItemListActions = { onMoveUp: (itemId: string) => void; onMoveDown: (itemId: string) => void; onRemove: (itemId: string) => void };

type ExerciseItemListProps<Item extends ListedExercise> = {
  label: string;
  items: readonly Item[];
  nameOf: (exerciseId: string) => string;
  actions: ItemListActions;
  children: (item: Item, name: string) => ReactNode;
};

type ExerciseItemRowProps = { name: string; position: number; count: number; onMoveUp: () => void; onMoveDown: () => void; onRemove: () => void; children: ReactNode };

function ExerciseItemRow({ name, position, count, onMoveUp, onMoveDown, onRemove, children }: ExerciseItemRowProps) {
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

export function ExerciseItemList<Item extends ListedExercise>({ label, items, nameOf, actions, children }: ExerciseItemListProps<Item>) {
  if (items.length === 0) return null;
  return (
    <ol aria-label={label} className="grid divide-y divide-border-subtle rounded-field border border-border-subtle bg-surface-base">
      {items.map((item, index) => {
        const name = nameOf(item.exerciseId);
        return (
          <ExerciseItemRow
            key={item.id}
            name={name}
            position={index + 1}
            count={items.length}
            onMoveUp={() => actions.onMoveUp(item.id)}
            onMoveDown={() => actions.onMoveDown(item.id)}
            onRemove={() => actions.onRemove(item.id)}
          >
            {children(item, name)}
          </ExerciseItemRow>
        );
      })}
    </ol>
  );
}
