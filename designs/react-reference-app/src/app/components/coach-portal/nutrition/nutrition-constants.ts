import type {
  FoodCategory,
  TagFamily,
  CookingMethod,
} from '../../../context/NutritionContext';

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
  'meal-time': 'bg-tint-slate-soft',
  'cycle-phase': 'bg-tint-violet-soft',
  nutrient: 'bg-tint-lime-soft',
  dietary: 'bg-tint-cyan-soft',
};

// Solid family-color dots (tag-picker chips in the food dialog).
export const TAG_FAMILY_DOT: Record<TagFamily, string> = {
  'meal-time': 'bg-tint-slate',
  'cycle-phase': 'bg-tint-violet',
  nutrient: 'bg-tint-lime',
  dietary: 'bg-tint-cyan',
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
