import type { FoodCategory, TagFamily } from '../../../context/NutritionContext';

export const CATEGORY_LABELS: Record<FoodCategory, string> = {
  protein: 'Protein',
  carb: 'Carb',
  fat: 'Fat',
  legume: 'Legumes',
  extra: 'Extra',
  seasoning: 'Seasoning',
};

// Decorative only — solid swatch/dot fills.
export const CATEGORY_SWATCH: Record<FoodCategory, string> = {
  protein: 'bg-nutrition-protein',
  carb: 'bg-nutrition-carb',
  fat: 'bg-nutrition-fat',
  legume: 'bg-nutrition-legume',
  extra: 'bg-nutrition-extra',
  seasoning: 'bg-nutrition-seasoning',
};

// Soft-tint surfaces (labels on top stay text-foreground for AAA contrast).
export const CATEGORY_SOFT: Record<FoodCategory, string> = {
  protein: 'bg-nutrition-protein-soft',
  carb: 'bg-nutrition-carb-soft',
  fat: 'bg-nutrition-fat-soft',
  legume: 'bg-nutrition-legume-soft',
  extra: 'bg-nutrition-extra-soft',
  seasoning: 'bg-nutrition-seasoning-soft',
};

export const CATEGORY_BORDER: Record<FoodCategory, string> = {
  protein: 'border-nutrition-protein',
  carb: 'border-nutrition-carb',
  fat: 'border-nutrition-fat',
  legume: 'border-nutrition-legume',
  extra: 'border-nutrition-extra',
  seasoning: 'border-nutrition-seasoning',
};

export const TAG_FAMILY_LABELS: Record<TagFamily, string> = {
  'meal-time': 'Meal-time',
  'cycle-phase': 'Cycle phase',
  nutrient: 'Nutrient / benefit',
  dietary: 'Dietary',
};
