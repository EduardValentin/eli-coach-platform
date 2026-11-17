import type { ReactNode, RefObject } from 'react';
import type { Exercise } from '../../../context/TrainingContext';
import { ExerciseNameButton } from '../../program-view/ExerciseNameButton';
import type { ExerciseDetailContent } from '../../program-view/exerciseDetailContent';
import { exerciseNameOf } from '../../program-view/programView';
import { GROUP_BRACKET_CLASS } from '../../program-view/SupersetGroup';
import { cn } from '../../ui/utils';
import { useItemEditing, type ItemListActions, type ListedExercise } from './itemEditing';

type ItemListFrame = 'plain' | 'bracket';

const LIST_CLASS: Record<ItemListFrame, string> = {
  plain: '',
  bracket: cn('grid bg-surface-base', GROUP_BRACKET_CLASS),
};

const ROW_CLASS: Record<ItemListFrame, string> = { plain: 'py-1', bracket: 'px-3 py-2' };

type ExerciseItemListProps<Item extends ListedExercise> = {
  label?: string;
  frame: ItemListFrame;
  items: readonly Item[];
  library: readonly Exercise[];
  detailFor: (item: Item, exercise: Exercise | undefined) => ExerciseDetailContent | null;
  place?: string;
  actions: ItemListActions;
  emptyFocus: RefObject<HTMLElement>;
  after?: (item: Item) => ReactNode;
  children: (item: Item, name: string, exercise: Exercise | undefined) => ReactNode;
};

export function ExerciseItemList<Item extends ListedExercise>({ label, frame, items, library, detailFor, place, actions, emptyFocus, after, children }: ExerciseItemListProps<Item>) {
  const exerciseOf = (item: Item) => library.find(other => other.id === item.exerciseId);
  const nameOf = (item: Item) => exerciseNameOf(exerciseOf(item));
  const menuFor = useItemEditing({ items, actions, emptyFocus, nameOf });

  if (items.length === 0) return null;
  return (
    <ol aria-label={label} className={cn('@container divide-y divide-border-subtle', LIST_CLASS[frame])}>
      {items.map((item, index) => {
        const exercise = exerciseOf(item);
        const detail = after?.(item);
        return (
          <li
            key={item.id}
            data-item-id={item.id}
            className={cn('grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 @lg:grid-cols-[minmax(0,1fr)_auto_auto]', ROW_CLASS[frame])}
          >
            <ExerciseNameButton exercise={exercise} detail={detailFor(item, exercise)} weight="medium" size="compact" place={place} />
            <div className="col-span-full row-start-2 flex flex-wrap items-start gap-2 @lg:col-span-1 @lg:col-start-2 @lg:row-start-1">{children(item, nameOf(item), exercise)}</div>
            <div className="col-start-2 row-start-1 flex @lg:col-start-3">{menuFor(index)}</div>
            {detail && <div className="col-span-full border-t border-border-subtle pt-2">{detail}</div>}
          </li>
        );
      })}
    </ol>
  );
}
