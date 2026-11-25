import type { ReactNode, RefObject } from "react";

import type { LibraryExercise } from "~/bounded-contexts/programs/training-programs/public/program-editing";
import type { ExerciseDetailContent } from "~/bounded-contexts/programs/training-programs/ui/shared/program-view/exercise-detail-content";
import { ExerciseNameButton } from "~/bounded-contexts/programs/training-programs/ui/shared/program-view/exercise-name-button";
import { exerciseNameOf } from "~/bounded-contexts/programs/training-programs/ui/shared/program-view/program-view";

import {
  useItemEditing,
  type ItemListActions,
  type ListedExercise,
} from "./item-editing";

type ExerciseItemListProps<Item extends ListedExercise> = {
  items: readonly Item[];
  libraryExercises: readonly LibraryExercise[];
  detailFor: (
    item: Item,
    exercise: LibraryExercise | undefined,
  ) => ExerciseDetailContent | null;
  actions: ItemListActions;
  emptyFocus: RefObject<HTMLElement | null>;
  children: (
    item: Item,
    name: string,
    exercise: LibraryExercise | undefined,
  ) => ReactNode;
};

export function ExerciseItemList<Item extends ListedExercise>({
  items,
  libraryExercises,
  detailFor,
  actions,
  emptyFocus,
  children,
}: ExerciseItemListProps<Item>) {
  const exerciseOf = (item: Item) =>
    libraryExercises.find((other) => other.id === item.exerciseId);
  const nameOf = (item: Item) => exerciseNameOf(exerciseOf(item));
  const menuFor = useItemEditing({ items, actions, emptyFocus, nameOf });

  if (items.length === 0) return null;

  return (
    <ol className="@container divide-y divide-border-subtle">
      {items.map((item, index) => {
        const exercise = exerciseOf(item);

        return (
          <li
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 py-1 @lg:grid-cols-[minmax(0,1fr)_auto_auto]"
            data-item-id={item.id}
            key={item.id}
          >
            <ExerciseNameButton
              detail={detailFor(item, exercise)}
              exercise={exercise}
              size="compact"
              weight="medium"
            />
            <div className="col-span-full row-start-2 flex flex-wrap items-start gap-2 @lg:col-span-1 @lg:col-start-2 @lg:row-start-1">
              {children(item, nameOf(item), exercise)}
            </div>
            <div className="col-start-2 row-start-1 flex @lg:col-start-3">
              {menuFor(index)}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
