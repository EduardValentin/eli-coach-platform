import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Search } from 'lucide-react';
import { useNutrition, recipeMacros, CALORIE_BANDS } from '../../../context/NutritionContext';
import type { Recipe, Tag } from '../../../context/NutritionContext';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { ToggleChip } from '../../ToggleChip';
import { RecipeCard } from './RecipeCard';
import { TAG_FAMILY_LABELS } from './nutrition-constants';

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

      <div className="flex flex-col gap-3">
        <div className="grid gap-1.5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Meal-time</p>
          <ul className="flex flex-wrap gap-2">
            {mealTimeTags.map((t: Tag) => (
              <li key={t.id}>
                <ToggleChip pressed={activeTagIds.includes(t.id)} onPressedChange={() => toggleTag(t.id)}>{t.label}</ToggleChip>
              </li>
            ))}
          </ul>
        </div>
        {filterFamilies.map((family) => (
          <div key={family} className="grid gap-1.5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{TAG_FAMILY_LABELS[family]}</p>
            <ul className="flex flex-wrap gap-2">
              {tags.filter((t: Tag) => t.family === family).map((t: Tag) => (
                <li key={t.id}>
                  <ToggleChip pressed={activeTagIds.includes(t.id)} onPressedChange={() => toggleTag(t.id)}>{t.label}</ToggleChip>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div className="grid gap-1.5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Calories</p>
          <ul className="flex flex-wrap gap-2">
            {CALORIE_BANDS.map((band) => (
              <li key={band}>
                <ToggleChip pressed={activeBand === band} onPressedChange={() => setActiveBand((prev) => (prev === band ? null : band))}>
                  Under {band} kcal
                </ToggleChip>
              </li>
            ))}
          </ul>
        </div>
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
