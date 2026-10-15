import type { ReactNode } from 'react';
import { useNutrition } from '../../../context/NutritionContext';
import type { Food } from '../../../context/NutritionContext';
import type { SortChoice } from '../../SortControl';
import { ItemIdentity } from '../../ItemIdentity';
import { SortableTableHead } from '../../SortableTableHead';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../ui/table';
import { FOOD_SORT, type FoodSortKey } from '../../../utils/foodListing';
import { CATEGORY_LABELS } from './nutrition-constants';
import { foodIcon } from './food-icons';
import { TagPill } from './TagPill';

const SORTED_COLUMNS: readonly { key: FoodSortKey; label: string }[] = [
  { key: 'name', label: 'Food' },
  { key: 'kcal', label: 'kcal' },
  { key: 'protein', label: 'Protein' },
  { key: 'carb', label: 'Carbs' },
  { key: 'fat', label: 'Fat' },
];

const VALUE_CELL = 'text-sm text-text-secondary tabular-nums';

const COLUMN_COUNT = SORTED_COLUMNS.length + 2;

interface FoodTableProps {
  foods: readonly Food[];
  sort: SortChoice<FoodSortKey>;
  onSort: (key: FoodSortKey) => void;
  actionsFor: (food: Food) => ReactNode;
  empty: ReactNode;
}

export function FoodTable({ foods, sort, onSort, actionsFor, empty }: FoodTableProps) {
  const { tags } = useNutrition();

  return (
    <Table>
      <TableHeader>
        <TableRow data-parity="food-header-row">
          {SORTED_COLUMNS.map(({ key, label }) => (
            <SortableTableHead
              key={key}
              label={label}
              active={sort.key === key}
              direction={sort.key === key ? sort.direction : FOOD_SORT.defaultDirection[key]}
              onSort={() => onSort(key)}
            />
          ))}
          <TableHead>Tags</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {foods.length === 0 ? (
          <TableRow>
            <TableCell colSpan={COLUMN_COUNT} className="p-0">
              {empty}
            </TableCell>
          </TableRow>
        ) : (
          foods.map((food) => {
              const foodTags = tags.filter((t) => food.tagIds.includes(t.id));
              return (
                <TableRow key={food.id} data-parity="food-row">
                  <TableCell>
                    <ItemIdentity
                      icon={foodIcon(food.icon)}
                      title={food.name}
                      summary={CATEGORY_LABELS[food.category]}
                      glyphParity="food-glyph"
                      summaryParity="food-category"
                    />
                  </TableCell>
                  <TableCell className={VALUE_CELL}>{food.kcal}</TableCell>
                  <TableCell className={VALUE_CELL}>{food.protein}g</TableCell>
                  <TableCell className={VALUE_CELL}>{food.carb}g</TableCell>
                  <TableCell className={VALUE_CELL}>{food.fat}g</TableCell>
                  <TableCell>
                    <ul className="flex flex-wrap gap-1" data-parity="food-tags">
                      {foodTags.map((t) => (
                        <li key={t.id}>
                          <TagPill tag={t} />
                        </li>
                      ))}
                    </ul>
                  </TableCell>
                  <TableCell data-parity="food-actions-cell">{actionsFor(food)}</TableCell>
                </TableRow>
              );
            })
        )}
      </TableBody>
    </Table>
  );
}
