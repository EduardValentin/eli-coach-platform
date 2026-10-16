import type { ComponentProps } from 'react';
import type {
  FoodCategory,
  TagFamily,
  CookingMethod,
} from '../../../context/NutritionContext';
import type { Badge } from '../../ui/badge';

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
  protein: 'bg-tint-red',
  carb: 'bg-tint-blue',
  fat: 'bg-tint-amber',
  legume: 'bg-tint-green',
  extra: 'bg-tint-purple',
  seasoning: 'bg-tint-teal',
};

export const CATEGORY_BORDER: Record<FoodCategory, string> = {
  protein: 'border-tint-red',
  carb: 'border-tint-blue',
  fat: 'border-tint-amber',
  legume: 'border-tint-green',
  extra: 'border-tint-purple',
  seasoning: 'border-tint-teal',
};

// Macro tile: soft color fill only (each macro reads as its own color; no border accent).
export const MACRO_TILE = {
  protein: 'bg-tint-red-soft',
  carb: 'bg-tint-blue-soft',
  fat: 'bg-tint-amber-soft',
} as const;

export const TAG_FAMILY_TONE: Record<TagFamily, NonNullable<ComponentProps<typeof Badge>['tone']>> = {
  'meal-time': 'tint-slate',
  'cycle-phase': 'tint-violet',
  nutrient: 'tint-lime',
  dietary: 'tint-cyan',
};

// Solid macro identity-color dots (used in the food table's macro column headers).
export const MACRO_DOT = {
  protein: 'bg-tint-red',
  carb: 'bg-tint-blue',
  fat: 'bg-tint-amber',
} as const;

// Macro progress-bar fills (protein / carb / fat use solid macro color; kcal uses brand).
export const MACRO_BAR = {
  protein: 'bg-tint-red',
  carb: 'bg-tint-blue',
  fat: 'bg-tint-amber',
  kcal: 'bg-brand',
} as const;

export const COOKING_METHOD_LABELS: Record<CookingMethod, string> = {
  raw: 'Raw',
  boiled: 'Boiled',
  grilled: 'Grilled',
  baked: 'Baked',
  'pan-fried': 'Pan-fried',
  steamed: 'Steamed',
};

export const TAG_FAMILY_LABELS: Record<TagFamily, string> = {
  'meal-time': 'Meal-time',
  'cycle-phase': 'Cycle phase',
  nutrient: 'Nutrient / benefit',
  dietary: 'Dietary',
};
