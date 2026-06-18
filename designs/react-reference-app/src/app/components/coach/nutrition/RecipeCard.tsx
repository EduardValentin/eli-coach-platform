import { Clock, Pencil } from 'lucide-react';
import { useNutrition, recipeMacros } from '../../../context/NutritionContext';
import type { Recipe, Tag } from '../../../context/NutritionContext';
import { Card, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';

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
    <Card className="gap-3">
      <CardContent className="pt-6 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-foreground truncate">{recipe.name}</p>
            <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <Clock size={12} aria-hidden="true" /> {totalMinutes} min
            </p>
          </div>
          <Button variant="ghost" size="icon" aria-label={`Edit ${recipe.name}`} onClick={() => onEdit(recipe)}>
            <Pencil size={16} />
          </Button>
        </div>

        <dl className="grid grid-cols-4 gap-2 text-center">
          {[
            { label: 'kcal', value: macros.kcal },
            { label: 'P', value: `${macros.protein}g` },
            { label: 'C', value: `${macros.carb}g` },
            { label: 'F', value: `${macros.fat}g` },
          ].map((m) => (
            <div key={m.label} className="rounded-lg bg-muted py-1.5">
              <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{m.label}</dt>
              <dd className="text-sm font-semibold text-foreground">{m.value}</dd>
            </div>
          ))}
        </dl>

        {(roleTags.length > 0 || otherTags.length > 0) && (
          <ul className="flex flex-wrap gap-1.5">
            {roleTags.map((t) => (
              <li key={t.id}><Badge variant="secondary" className="font-normal">{t.label}</Badge></li>
            ))}
            {otherTags.map((t) => (
              <li key={t.id}><Badge variant="outline" className="font-normal">{t.label}</Badge></li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
