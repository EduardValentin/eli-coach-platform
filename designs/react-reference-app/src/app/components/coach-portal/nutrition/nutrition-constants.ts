import type { FoodCategory, TagFamily, CookingMethod } from '../../../context/NutritionContext';

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

// Macro tile: soft color fill only (each macro reads as its own color; no border accent).
export const MACRO_TILE = {
  protein: 'bg-macro-protein-soft',
  carb: 'bg-macro-carb-soft',
  fat: 'bg-macro-fat-soft',
} as const;

// Tag pill: soft family-tinted fill (text stays dark for AAA).
export const TAG_FAMILY_PILL: Record<TagFamily, string> = {
  'meal-time': 'bg-tag-mealtime-soft',
  'cycle-phase': 'bg-tag-cycle-soft',
  nutrient: 'bg-tag-nutrient-soft',
  dietary: 'bg-tag-dietary-soft',
};

// Solid family-color dots (tag-picker chips in the food dialog).
export const TAG_FAMILY_DOT: Record<TagFamily, string> = {
  'meal-time': 'bg-tag-mealtime',
  'cycle-phase': 'bg-tag-cycle',
  nutrient: 'bg-tag-nutrient',
  dietary: 'bg-tag-dietary',
};

// Family-colored left edge for the tag-group cards in the food dialog.
export const TAG_FAMILY_BORDER: Record<TagFamily, string> = {
  'meal-time': 'border-l-tag-mealtime',
  'cycle-phase': 'border-l-tag-cycle',
  nutrient: 'border-l-tag-nutrient',
  dietary: 'border-l-tag-dietary',
};

export const CATEGORY_ICON_COLOR: Record<FoodCategory, string> = {
  protein: 'text-nutrition-protein',
  carb: 'text-nutrition-carb',
  fat: 'text-nutrition-fat',
  legume: 'text-nutrition-legume',
  extra: 'text-nutrition-extra',
  seasoning: 'text-nutrition-seasoning',
};

// Solid macro identity-color dots (used in the food table's macro column headers).
export const MACRO_DOT = {
  protein: 'bg-macro-protein',
  carb: 'bg-macro-carb',
  fat: 'bg-macro-fat',
} as const;

// Macro progress-bar fills (protein / carb / fat use solid macro color; kcal uses brand).
export const MACRO_BAR = {
  protein: 'bg-macro-protein',
  carb: 'bg-macro-carb',
  fat: 'bg-macro-fat',
  kcal: 'bg-macro-kcal',
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
