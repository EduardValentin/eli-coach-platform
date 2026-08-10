import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Search } from 'lucide-react';
import { useNutrition, recipeMacros, CALORIE_BANDS } from '../../../context/NutritionContext';
import type { Recipe, Tag } from '../../../context/NutritionContext';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { RecipeCard } from './RecipeCard';
import { TAG_FAMILY_LABELS } from './nutrition-constants';
import { FilterDropdown } from './FilterDropdown';

export function RecipeLibrary() {
  const { recipes, tags, foods } = useNutrition();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeTagIds, setActiveTagIds] = useState<string[]>([]); // meal-time + cycle + dietary tag ids
  const [activeBand, setActiveBand] = useState<number | null>(null);

  const toggleTag = (id: string) =>
    setActiveTagIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const mealTimeTags = tags.filter((t: Tag) => t.family === 'meal-time');
  const filterFamilies = (['cycle-phase', 'dietary'] as const);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return recipes.filter((r) => {
      const matchesQuery = !q || r.name.toLowerCase().includes(q);
      const recipeTagIds = [...r.mealRoleIds, ...r.tagIds];
      const matchesTags = activeTagIds.every((id) => recipeTagIds.includes(id));
      const matchesBand = activeBand === null || recipeMacros(r, foods).kcal <= activeBand;
      return matchesQuery && matchesTags && matchesBand;
    });
  }, [recipes, query, activeTagIds, activeBand, foods]);

  const openEdit = (recipe: Recipe) => navigate(`/coach/nutrition/recipe-builder/${recipe.id}`);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search recipes…"
            aria-label="Search recipes"
            className="pl-9"
          />
        </div>
        <Button onClick={() => navigate('/coach/nutrition/recipe-builder')}>
          <Plus size={16} /> New recipe
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FilterDropdown
          label="Meal-time"
          options={mealTimeTags.map((t: Tag) => ({ value: t.id, label: t.label }))}
          selected={activeTagIds.filter((id) => mealTimeTags.some((t: Tag) => t.id === id))}
          onToggle={toggleTag}
        />
        {filterFamilies.map((family) => {
          const familyTags = tags.filter((t: Tag) => t.family === family);
          return (
            <FilterDropdown
              key={family}
              label={TAG_FAMILY_LABELS[family]}
              options={familyTags.map((t: Tag) => ({ value: t.id, label: t.label }))}
              selected={activeTagIds.filter((id) => familyTags.some((t: Tag) => t.id === id))}
              onToggle={toggleTag}
            />
          );
        })}
        <FilterDropdown
          label="Calories"
          options={CALORIE_BANDS.map((b) => ({ value: String(b), label: `Under ${b} kcal` }))}
          selected={activeBand !== null ? [String(activeBand)] : []}
          onToggle={(v) => setActiveBand((prev) => (prev === Number(v) ? null : Number(v)))}
        />
        {(activeTagIds.length > 0 || activeBand !== null) && (
          <Button variant="ghost" size="sm" onClick={() => { setActiveTagIds([]); setActiveBand(null); }}>
            Clear
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground">No recipes match your search and filters.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} onEdit={openEdit} />
          ))}
        </div>
      )}
    </div>
  );
}
