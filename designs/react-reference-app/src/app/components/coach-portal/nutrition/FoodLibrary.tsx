import { useMemo, useState } from 'react';
import { LayoutGrid, Plus, Search, Shuffle, Tags } from 'lucide-react';
import { useNutrition, FOOD_CATEGORIES } from '../../../context/NutritionContext';
import type { Food, FoodCategory } from '../../../context/NutritionContext';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
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

  const openCreate = () => { setEditing(undefined); setDialogOpen(true); };
  const openEdit = (food: Food) => { setEditing(food); setDialogOpen(true); };

  const toggleCategory = (c: FoodCategory) =>
    setActiveCategories((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return foods.filter((f) => {
      const matchesQuery = !q || f.name.toLowerCase().includes(q);
      const matchesCategory = activeCategories.length === 0 || activeCategories.includes(f.category);
      return matchesQuery && matchesCategory;
    });
  }, [foods, query, activeCategories]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {view === 'catalog' && (
            <div className="relative w-full max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search foods…"
                aria-label="Search foods"
                className="pl-9"
              />
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button variant={view === 'catalog' ? 'default' : 'outline'} size="sm" onClick={() => setView('catalog')} aria-pressed={view === 'catalog'}>
              <LayoutGrid size={16} /> Catalog
            </Button>
            <Button variant={view === 'board' ? 'default' : 'outline'} size="sm" onClick={() => setView('board')} aria-pressed={view === 'board'}>
              <Tags size={16} /> Tag board
            </Button>
            <Button variant={view === 'groups' ? 'default' : 'outline'} size="sm" onClick={() => setView('groups')} aria-pressed={view === 'groups'}>
              <Shuffle size={16} /> Swap groups
            </Button>
            <Button
              size="sm"
              onClick={openCreate}
              className="ml-auto bg-brand text-brand-foreground shadow-sm hover:bg-brand-hover"
            >
              <Plus size={16} /> Add food
            </Button>
          </div>
        </div>
        {view === 'catalog' && (
          <ul className="flex flex-wrap gap-2" aria-label="Filter by category">
            {FOOD_CATEGORIES.map((c) => (
              <li key={c}>
                <ToggleChip pressed={activeCategories.includes(c)} onPressedChange={() => toggleCategory(c)}>
                  {CATEGORY_LABELS[c]}
                </ToggleChip>
              </li>
            ))}
          </ul>
        )}
      </div>

      {view === 'groups' ? (
        <EquivalenceGroups />
      ) : view === 'board' ? (
        <FoodTagBoard />
      ) : (
        filtered.length === 0 ? (
          <p className="text-muted-foreground">No foods match your filters.</p>
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
        )
      )}
      <FoodFormDialog open={dialogOpen} food={editing} onOpenChange={setDialogOpen} />
    </div>
  );
}
