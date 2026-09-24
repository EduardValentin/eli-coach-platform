import { Pencil } from 'lucide-react';
import type { Food, Tag } from '../../../context/NutritionContext';
import { useNutrition } from '../../../context/NutritionContext';
import { Card, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { VALUE_CLASS } from '../../typography';
import {
  CATEGORY_LABELS,
  CATEGORY_SOFT,
  CATEGORY_ICON_COLOR,
  MACRO_TILE,
} from './nutrition-constants';
import { foodIcon } from './food-icons';
import { TagPill } from './TagPill';

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
    <Card className="flex flex-col gap-3">
      <CardContent className="pt-6 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            {(() => {
              const Icon = foodIcon(food.icon);
              return (
                <Icon
                  size={20}
                  className={`shrink-0 mt-0.5 ${CATEGORY_ICON_COLOR[food.category]}`}
                  aria-hidden="true"
                />
              );
            })()}
            <div className="min-w-0">
              <p className="font-medium text-text-primary truncate">
                {food.name}
              </p>
              <Badge
                className={`mt-1 w-fit text-text-primary ${CATEGORY_SOFT[food.category]}`}
              >
                {CATEGORY_LABELS[food.category]}
              </Badge>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Edit ${food.name}`}
            onClick={() => onEdit(food)}
          >
            <Pencil size={16} />
          </Button>
        </div>

        <div>
          <p className="text-label uppercase text-text-secondary mb-1.5">
            Per 100 g
          </p>
          <dl className="grid grid-cols-4 gap-2">
            {[
              {
                key: 'kcal',
                label: 'kcal',
                value: food.kcal,
                tile: 'bg-surface-quiet',
              },
              {
                key: 'protein',
                label: 'P',
                value: `${food.protein}g`,
                tile: MACRO_TILE.protein,
              },
              {
                key: 'carb',
                label: 'C',
                value: `${food.carb}g`,
                tile: MACRO_TILE.carb,
              },
              {
                key: 'fat',
                label: 'F',
                value: `${food.fat}g`,
                tile: MACRO_TILE.fat,
              },
            ].map((m) => (
              <div
                key={m.key}
                className={`rounded-compact px-1.5 py-2 text-center ${m.tile}`}
              >
                <dt className="text-label uppercase text-text-primary">
                  {m.label}
                </dt>
                <dd className={`${VALUE_CLASS} tabular-nums leading-tight`}>
                  {m.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {foodTags.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {foodTags.map((t) => (
              <li key={t.id}>
                <TagPill tag={t} />
              </li>
            ))}
          </ul>
        )}

        {group && (
          <p className="text-xs text-text-secondary">
            Swap group:{' '}
            <span className="text-text-primary font-medium">{group.name}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
