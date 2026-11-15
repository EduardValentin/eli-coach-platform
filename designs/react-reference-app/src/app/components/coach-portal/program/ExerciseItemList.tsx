import type { ReactNode, RefObject } from 'react';
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import { RowActionsMenu } from '../../RowActionsMenu';
import { useEditorAnnouncer } from './editorAnnouncer';
import { actionsTriggerIn, usePendingFocus } from './usePendingFocus';

type ListedExercise = { id: string; exerciseId: string };
export type ItemListActions = { onMoveUp: (itemId: string) => void; onMoveDown: (itemId: string) => void; onRemove: (itemId: string) => void };

type ExerciseItemListProps<Item extends ListedExercise> = {
  label: string;
  items: readonly Item[];
  nameOf: (exerciseId: string) => string;
  actions: ItemListActions;
  emptyFocus: RefObject<HTMLElement>;
  children: (item: Item, name: string) => ReactNode;
};

type ExerciseItemRowProps = { itemId: string; name: string; position: number; count: number; onMoveUp: () => void; onMoveDown: () => void; onRemove: () => void; children: ReactNode };

function ExerciseItemRow({ itemId, name, position, count, onMoveUp, onMoveDown, onRemove, children }: ExerciseItemRowProps) {
  return (
    <li data-item-id={itemId} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-3 py-2 @lg:grid-cols-[minmax(0,1fr)_auto_auto]">
      <span className="text-sm font-medium text-text-primary">{name}</span>
      <div className="col-span-full row-start-2 flex flex-wrap items-start gap-2 @lg:col-span-1 @lg:col-start-2 @lg:row-start-1">{children}</div>
      <div className="col-start-2 row-start-1 flex @lg:col-start-3">
        <RowActionsMenu
          label={`${name} actions`}
          size="xs"
          actions={[
            { name: 'up', label: 'Move up', icon: ArrowUp, disabled: position === 1, onSelect: onMoveUp },
            { name: 'down', label: 'Move down', icon: ArrowDown, disabled: position === count, onSelect: onMoveDown },
            { name: 'remove', label: 'Remove', icon: Trash2, tone: 'destructive', onSelect: onRemove },
          ]}
        />
      </div>
    </li>
  );
}

export function ExerciseItemList<Item extends ListedExercise>({ label, items, nameOf, actions, emptyFocus, children }: ExerciseItemListProps<Item>) {
  const announce = useEditorAnnouncer();
  const focusLater = usePendingFocus();
  const focusItem = (itemId: string) => focusLater(() => actionsTriggerIn(`[data-item-id="${itemId}"]`));

  function remove(index: number, name: string) {
    const neighbour = items[index + 1] ?? items[index - 1];
    actions.onRemove(items[index].id);
    if (neighbour) focusItem(neighbour.id);
    else focusLater(() => emptyFocus.current);
    announce(`${name} removed`);
  }

  if (items.length === 0) return null;
  return (
    <ol aria-label={label} className="@container grid divide-y divide-border-subtle rounded-field border border-border-subtle bg-surface-base">
      {items.map((item, index) => {
        const name = nameOf(item.exerciseId);
        return (
          <ExerciseItemRow
            key={item.id}
            itemId={item.id}
            name={name}
            position={index + 1}
            count={items.length}
            onMoveUp={() => {
              actions.onMoveUp(item.id);
              focusItem(item.id);
              announce(`${name} moved up`);
            }}
            onMoveDown={() => {
              actions.onMoveDown(item.id);
              focusItem(item.id);
              announce(`${name} moved down`);
            }}
            onRemove={() => remove(index, name)}
          >
            {children(item, name)}
          </ExerciseItemRow>
        );
      })}
    </ol>
  );
}
