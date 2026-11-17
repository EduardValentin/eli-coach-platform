import type { ReactNode, RefObject } from 'react';
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import { RowActionsMenu } from '../../RowActionsMenu';
import { useEditorAnnouncer } from './editorAnnouncer';
import { actionsTriggerIn, usePendingFocus } from './usePendingFocus';

export type ListedExercise = { id: string; exerciseId: string };
export type ItemListActions = { onMoveUp: (itemId: string) => void; onMoveDown: (itemId: string) => void; onRemove: (itemId: string) => void };

type ItemEditingOptions<Item extends ListedExercise> = {
  items: readonly Item[];
  actions: ItemListActions;
  emptyFocus: RefObject<HTMLElement>;
  nameOf: (item: Item) => string;
};

export function useItemEditing<Item extends ListedExercise>({ items, actions, emptyFocus, nameOf }: ItemEditingOptions<Item>): (index: number) => ReactNode {
  const announce = useEditorAnnouncer();
  const focusLater = usePendingFocus();
  const focusItem = (itemId: string) => focusLater(() => actionsTriggerIn(`[data-item-id="${itemId}"]`));

  function move(index: number, direction: 'up' | 'down') {
    const item = items[index];
    if (direction === 'up') actions.onMoveUp(item.id);
    else actions.onMoveDown(item.id);
    focusItem(item.id);
    announce(`${nameOf(item)} moved ${direction}`);
  }

  function remove(index: number) {
    const neighbour = items[index + 1] ?? items[index - 1];
    actions.onRemove(items[index].id);
    if (neighbour) focusItem(neighbour.id);
    else focusLater(() => emptyFocus.current);
    announce(`${nameOf(items[index])} removed`);
  }

  return index => (
    <RowActionsMenu
      label={`${nameOf(items[index])} actions`}
      size="xs"
      actions={[
        { name: 'up', label: 'Move up', icon: ArrowUp, disabled: index === 0, onSelect: () => move(index, 'up') },
        { name: 'down', label: 'Move down', icon: ArrowDown, disabled: index === items.length - 1, onSelect: () => move(index, 'down') },
        { name: 'remove', label: 'Remove', icon: Trash2, tone: 'destructive', onSelect: () => remove(index) },
      ]}
    />
  );
}
