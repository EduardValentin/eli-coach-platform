import type { ReactNode } from 'react';
import { Clock } from 'lucide-react';
import { useNutrition, recipeMacros } from '../../../context/NutritionContext';
import type { Recipe, Tag } from '../../../context/NutritionContext';
import { VALUE_CLASS } from '../../typography';
import { cardVariants } from '../../ui/card';
import { cn } from '../../ui/utils';
import { MACRO_TILE } from './nutrition-constants';
import { TagPill } from './TagPill';
import { RecipeVisual } from './RecipeVisual';

interface RecipeCardProps {
  recipe: Recipe;
  actions: ReactNode;
}

export function RecipeCard({ recipe, actions }: RecipeCardProps) {
  const { foods, tags } = useNutrition();
  const macros = recipeMacros(recipe, foods);
  const recipeTags: Tag[] = [...recipe.mealRoleIds, ...recipe.tagIds]
    .map((id) => tags.find((t) => t.id === id))
    .filter((t): t is Tag => Boolean(t));
  const totalMinutes = recipe.prepMinutes + recipe.cookMinutes;
  const macroTiles = [
    { key: 'kcal', label: 'kcal', value: macros.kcal, tile: 'bg-surface-quiet' },
    { key: 'protein', label: 'P', value: `${macros.protein}g`, tile: MACRO_TILE.protein },
    { key: 'carb', label: 'C', value: `${macros.carb}g`, tile: MACRO_TILE.carb },
    { key: 'fat', label: 'F', value: `${macros.fat}g`, tile: MACRO_TILE.fat },
  ];

  return (
    <article
      aria-label={recipe.name}
      data-parity-root="RecipeCard"
      className={cn(cardVariants({ variant: 'item' }), 'flex flex-col overflow-hidden')}
    >
      <RecipeVisual recipe={recipe} className="h-32 w-full" />
      <div className="flex flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-medium text-text-primary">{recipe.name}</h2>
            <span className="inline-flex items-center gap-1 text-xs text-text-secondary">
              <Clock size={12} aria-hidden="true" /> {totalMinutes} min
            </span>
          </div>
          {actions}
        </div>

        <div>
          <p className="text-label uppercase text-text-secondary mb-1.5">Per recipe</p>
          <dl className="grid grid-cols-4 gap-2" data-parity="recipe-macro-tiles">
            {macroTiles.map((m) => (
              <div
                key={m.key}
                data-parity-root="ValueTile"
                className={cn('rounded-compact px-1.5 py-2 text-center', m.tile)}
              >
                <dt className="text-label uppercase text-text-primary">{m.label}</dt>
                <dd className={cn(VALUE_CLASS, 'tabular-nums leading-tight')}>{m.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {recipeTags.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {recipeTags.map((t) => (
              <li key={t.id}>
                <TagPill tag={t} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
