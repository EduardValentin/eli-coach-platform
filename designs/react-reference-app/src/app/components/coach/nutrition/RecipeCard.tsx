import { Clock, Pencil } from 'lucide-react';
import { useNutrition, recipeMacros } from '../../../context/NutritionContext';
import type { Recipe, Tag } from '../../../context/NutritionContext';
import { Card, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';
import { MACRO_TILE } from './nutrition-constants';
import { TagPill } from './TagPill';
import { RecipeVisual } from './RecipeVisual';

interface RecipeCardProps {
  recipe: Recipe;
  onEdit: (recipe: Recipe) => void;
}

export function RecipeCard({ recipe, onEdit }: RecipeCardProps) {
  const { foods, tags } = useNutrition();
  const macros = recipeMacros(recipe, foods);
  const roleTags: Tag[] = recipe.mealRoleIds
    .map((id) => tags.find((t) => t.id === id))
    .filter((t): t is Tag => Boolean(t));
  const otherTags: Tag[] = recipe.tagIds
    .map((id) => tags.find((t) => t.id === id))
    .filter((t): t is Tag => Boolean(t));
  const totalMinutes = recipe.prepMinutes + recipe.cookMinutes;

  return (
    <Card className="gap-3 overflow-hidden">
      <RecipeVisual recipe={recipe} className="h-32 w-full rounded-t-[inherit]" />
      <CardContent className="pt-3 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-foreground truncate">{recipe.name}</p>
            <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <Clock size={12} aria-hidden="true" /> {totalMinutes} min
            </span>
          </div>
          <Button variant="ghost" size="icon" aria-label={`Edit ${recipe.name}`} onClick={() => onEdit(recipe)}>
            <Pencil size={16} aria-hidden="true" />
          </Button>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">Per recipe</p>
          <dl className="grid grid-cols-4 gap-2">
            {[
              { key: 'kcal', label: 'kcal', value: macros.kcal, tile: 'bg-muted' },
              { key: 'protein', label: 'P', value: `${macros.protein}g`, tile: MACRO_TILE.protein },
              { key: 'carb', label: 'C', value: `${macros.carb}g`, tile: MACRO_TILE.carb },
              { key: 'fat', label: 'F', value: `${macros.fat}g`, tile: MACRO_TILE.fat },
            ].map((m) => (
              <div key={m.key} className={`rounded-lg px-1.5 py-2 text-center ${m.tile}`}>
                <dt className="text-[10px] uppercase tracking-wide text-foreground">{m.label}</dt>
                <dd className="text-base font-bold text-foreground leading-tight">{m.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {(roleTags.length > 0 || otherTags.length > 0) && (
          <ul className="flex flex-wrap gap-1.5">
            {[...roleTags, ...otherTags].map((t) => (
              <li key={t.id}>
                <TagPill tag={t} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
