import { useMemo, useState, type ReactNode } from 'react';
import { ChevronUp, ChevronDown, Pencil } from 'lucide-react';
import { useNutrition } from '../../../context/NutritionContext';
import type { Food, Tag } from '../../../context/NutritionContext';
import { Button } from '../../ui/button';
import { CATEGORY_LABELS, CATEGORY_SWATCH, TAG_FAMILY_PILL, MACRO_DOT } from './nutrition-constants';

type SortKey = 'name' | 'kcal' | 'protein' | 'carb' | 'fat';

interface FoodTableProps {
  foods: Food[];
  onEdit: (food: Food) => void;
}

export function FoodTable({ foods, onEdit }: FoodTableProps) {
  const { tags } = useNutrition();
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [dir, setDir] = useState<'asc' | 'desc'>('asc');

  const toggleSort = (k: SortKey) => {
    if (k === sortKey) setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(k); setDir('asc'); }
  };

  const sorted = useMemo(() => {
    const factor = dir === 'asc' ? 1 : -1;
    return [...foods].sort((a, b) =>
      sortKey === 'name'
        ? a.name.localeCompare(b.name) * factor
        : (a[sortKey] - b[sortKey]) * factor,
    );
  }, [foods, sortKey, dir]);

  const ariaSort = (k: SortKey): 'ascending' | 'descending' | 'none' =>
    sortKey === k ? (dir === 'asc' ? 'ascending' : 'descending') : 'none';

  const headerBtn = (k: SortKey, label: ReactNode) => (
    <button type="button" onClick={() => toggleSort(k)} className="inline-flex items-center gap-1 font-medium hover:text-foreground">
      {label}
      {sortKey === k && (dir === 'asc' ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />)}
    </button>
  );

  const macroHead = (k: 'protein' | 'carb' | 'fat', letter: string) => (
    <span className="inline-flex items-center gap-1">
      <span className={`size-1.5 rounded-full ${MACRO_DOT[k]}`} aria-hidden="true" />
      {letter}
    </span>
  );

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-muted-foreground">
          <th scope="col" aria-sort={ariaSort('name')} className="border-b border-border py-2 pr-3">{headerBtn('name', 'Food')}</th>
          <th scope="col" aria-sort={ariaSort('kcal')} className="border-b border-border py-2 px-3 text-right">{headerBtn('kcal', 'kcal')}</th>
          <th scope="col" aria-sort={ariaSort('protein')} className="border-b border-border py-2 px-3 text-right">{headerBtn('protein', macroHead('protein', 'P'))}</th>
          <th scope="col" aria-sort={ariaSort('carb')} className="border-b border-border py-2 px-3 text-right">{headerBtn('carb', macroHead('carb', 'C'))}</th>
          <th scope="col" aria-sort={ariaSort('fat')} className="border-b border-border py-2 px-3 text-right">{headerBtn('fat', macroHead('fat', 'F'))}</th>
          <th scope="col" className="border-b border-border py-2 px-3 font-medium">Tags</th>
          <th scope="col" className="border-b border-border py-2 pl-3"><span className="sr-only">Actions</span></th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((food) => {
          const foodTags = food.tagIds
            .map((id) => tags.find((t) => t.id === id))
            .filter((t): t is Tag => Boolean(t));
          return (
            <tr key={food.id} className="hover:bg-muted/40">
              <td className="border-b border-border/60 py-2 pr-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`size-2 rounded-full shrink-0 ${CATEGORY_SWATCH[food.category]}`} aria-hidden="true" />
                  <span className="font-medium text-foreground truncate">{food.name}</span>
                  <span className="hidden lg:inline text-xs text-muted-foreground shrink-0">{CATEGORY_LABELS[food.category]}</span>
                </div>
              </td>
              <td className="border-b border-border/60 py-2 px-3 text-right tabular-nums text-foreground">{food.kcal}</td>
              <td className="border-b border-border/60 py-2 px-3 text-right tabular-nums text-foreground">{food.protein}g</td>
              <td className="border-b border-border/60 py-2 px-3 text-right tabular-nums text-foreground">{food.carb}g</td>
              <td className="border-b border-border/60 py-2 px-3 text-right tabular-nums text-foreground">{food.fat}g</td>
              <td className="border-b border-border/60 py-2 px-3">
                <ul className="flex flex-wrap gap-1">
                  {foodTags.map((t) => (
                    <li key={t.id}>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium text-foreground ${TAG_FAMILY_PILL[t.family]}`}>{t.label}</span>
                    </li>
                  ))}
                </ul>
              </td>
              <td className="border-b border-border/60 py-2 pl-3 text-right">
                <Button variant="ghost" size="icon" aria-label={`Edit ${food.name}`} onClick={() => onEdit(food)}>
                  <Pencil size={16} aria-hidden="true" />
                </Button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
