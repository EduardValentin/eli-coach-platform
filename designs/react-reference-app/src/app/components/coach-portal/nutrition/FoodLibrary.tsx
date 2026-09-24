import { useMemo, useState } from 'react';
import { LayoutGrid, Plus, Shuffle, Tags } from 'lucide-react';
import {
  useNutrition,
  FOOD_CATEGORIES,
} from '../../../context/NutritionContext';
import type { Food, FoodCategory } from '../../../context/NutritionContext';
import { Button } from '../../ui/button';
import { FilterChip, FilterChipGroup } from '../../FilterChipGroup';
import { SearchField } from '../../SearchField';
import { ToggleChip } from '../../ToggleChip';
import { FoodCard } from './FoodCard';
import { FoodTable } from './FoodTable';
import { CATEGORY_LABELS } from './nutrition-constants';
import { FoodFormDialog } from './FoodFormDialog';
import { FoodTagBoard } from './FoodTagBoard';
import { EquivalenceGroups } from './EquivalenceGroups';

export function FoodLibrary() {
  const { foods } = useNutrition();
  const [query, setQuery] = useState('');
  const [activeCategories, setActiveCategories] = useState<FoodCategory[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Food | undefined>(undefined);
  const [view, setView] = useState<'catalog' | 'board' | 'groups'>('catalog');

  const openCreate = () => {
    setEditing(undefined);
    setDialogOpen(true);
  };
  const openEdit = (food: Food) => {
    setEditing(food);
    setDialogOpen(true);
  };

  const toggleCategory = (c: FoodCategory) =>
    setActiveCategories((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return foods.filter((f) => {
      const matchesQuery = !q || f.name.toLowerCase().includes(q);
      const matchesCategory =
        activeCategories.length === 0 || activeCategories.includes(f.category);
      return matchesQuery && matchesCategory;
    });
  }, [foods, query, activeCategories]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterChipGroup
          aria-label="Food library view"
          value={view}
          onValueChange={(value) => {
            if (value) setView(value as typeof view);
          }}
        >
          <FilterChip value="catalog">
            <LayoutGrid size={16} /> Catalog
          </FilterChip>
          <FilterChip value="board">
            <Tags size={16} /> Tag board
          </FilterChip>
          <FilterChip value="groups">
            <Shuffle size={16} /> Swap groups
          </FilterChip>
        </FilterChipGroup>
        <Button size="xs" onClick={openCreate}>
          <Plus size={16} /> Add food
        </Button>
      </div>

      {view === 'catalog' && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <SearchField
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search foods…"
              aria-label="Search foods"
              className="w-full max-w-md"
            />
            <ul
              className="flex flex-wrap gap-2"
              aria-label="Filter by category"
            >
              {FOOD_CATEGORIES.map((c) => (
                <li key={c}>
                  <ToggleChip
                    pressed={activeCategories.includes(c)}
                    onPressedChange={() => toggleCategory(c)}
                  >
                    {CATEGORY_LABELS[c]}
                  </ToggleChip>
                </li>
              ))}
            </ul>
          </div>
          {filtered.length === 0 ? (
            <p className="text-text-secondary">No foods match your filters.</p>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <FoodTable foods={filtered} onEdit={openEdit} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:hidden">
                {filtered.map((food) => (
                  <FoodCard key={food.id} food={food} onEdit={openEdit} />
                ))}
              </div>
            </>
          )}
        </div>
      )}
      {view === 'board' && (
        <div>
          <FoodTagBoard />
        </div>
      )}
      {view === 'groups' && (
        <div>
          <EquivalenceGroups />
        </div>
      )}

      <FoodFormDialog
        open={dialogOpen}
        food={editing}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
