import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Search } from 'lucide-react';
import { useNutrition } from '../../../context/NutritionContext';
import type { Recipe } from '../../../context/NutritionContext';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { RecipeCard } from './RecipeCard';

export function RecipeLibrary() {
  const { recipes } = useNutrition();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return recipes.filter((r) => !q || r.name.toLowerCase().includes(q));
  }, [recipes, query]);

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

      {filtered.length === 0 ? (
        <p className="text-muted-foreground">No recipes match your search.</p>
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
