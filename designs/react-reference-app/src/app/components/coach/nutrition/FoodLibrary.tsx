import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useNutrition, FOOD_CATEGORIES } from '../../../context/NutritionContext';
import type { Food, FoodCategory } from '../../../context/NutritionContext';
import { Input } from '../../ui/input';
import { ToggleChip } from '../../ToggleChip';
import { FoodCard } from './FoodCard';
import { CATEGORY_LABELS } from './nutrition-constants';

export function FoodLibrary() {
  const { foods } = useNutrition();
  const [query, setQuery] = useState('');
  const [activeCategories, setActiveCategories] = useState<FoodCategory[]>([]);

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

  const grouped: { category: FoodCategory; items: Food[] }[] = FOOD_CATEGORIES
    .map((category) => ({ category, items: filtered.filter((f) => f.category === category) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="relative max-w-md">
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
        <ul className="flex flex-wrap gap-2" aria-label="Filter by category">
          {FOOD_CATEGORIES.map((c) => (
            <li key={c}>
              <ToggleChip pressed={activeCategories.includes(c)} onPressedChange={() => toggleCategory(c)}>
                {CATEGORY_LABELS[c]}
              </ToggleChip>
            </li>
          ))}
        </ul>
      </div>

      {grouped.length === 0 ? (
        <p className="text-muted-foreground">No foods match your filters.</p>
      ) : (
        grouped.map((group) => (
          <section key={group.category} aria-label={CATEGORY_LABELS[group.category]}>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              {CATEGORY_LABELS[group.category]}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {group.items.map((food) => (
                <FoodCard key={food.id} food={food} onEdit={() => { /* wired in Task 5 */ }} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
