import { Pencil } from 'lucide-react';
import type { Food, Tag } from '../../../context/NutritionContext';
import { useNutrition } from '../../../context/NutritionContext';
import { Card, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { CATEGORY_LABELS, CATEGORY_SWATCH } from './nutrition-constants';

interface FoodCardProps {
  food: Food;
  onEdit: (food: Food) => void;
}

export function FoodCard({ food, onEdit }: FoodCardProps) {
  const { tags, equivalenceGroups } = useNutrition();
  const foodTags: Tag[] = food.tagIds
    .map((id) => tags.find((t) => t.id === id))
    .filter((t): t is Tag => Boolean(t));
  const group = food.equivalenceGroupId
    ? equivalenceGroups.find((g) => g.id === food.equivalenceGroupId)
    : undefined;

  return (
    <Card className="gap-3">
      <CardContent className="pt-6 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`size-3 rounded-full shrink-0 ${CATEGORY_SWATCH[food.category]}`}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="font-semibold text-foreground truncate">{food.name}</p>
              <p className="text-xs text-muted-foreground">
                {CATEGORY_LABELS[food.category]} · per 100 g
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Edit ${food.name}`}
            onClick={() => onEdit(food)}
          >
            <Pencil size={16} />
          </Button>
        </div>

        <dl className="grid grid-cols-4 gap-2 text-center">
          {[
            { label: 'kcal', value: food.kcal },
            { label: 'P', value: `${food.protein}g` },
            { label: 'C', value: `${food.carb}g` },
            { label: 'F', value: `${food.fat}g` },
          ].map((m) => (
            <div key={m.label} className="rounded-lg bg-muted py-1.5">
              <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{m.label}</dt>
              <dd className="text-sm font-semibold text-foreground">{m.value}</dd>
            </div>
          ))}
        </dl>

        {foodTags.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {foodTags.map((t) => (
              <li key={t.id}>
                <Badge variant="outline" className="font-normal">{t.label}</Badge>
              </li>
            ))}
          </ul>
        )}

        {group && (
          <p className="text-xs text-muted-foreground">
            Swap group: <span className="text-foreground font-medium">{group.name}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
