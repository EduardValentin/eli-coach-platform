export const FOOD_CATEGORIES = [
  "protein",
  "carb",
  "fat",
  "legume",
  "extra",
  "seasoning",
] as const;
export type FoodCategory = (typeof FOOD_CATEGORIES)[number];

export const FOOD_ICONS = [
  "egg",
  "poultry",
  "meat",
  "fish",
  "ham",
  "dairy",
  "grain",
  "bread",
  "sandwich",
  "root-veg",
  "leafy",
  "veg",
  "herb",
  "apple",
  "banana",
  "citrus",
  "cherry",
  "grape",
  "legume",
  "nut",
  "oil",
  "chocolate",
  "candy",
  "ice-cream",
  "cake",
  "soup",
  "drink",
  "other",
] as const;
export type FoodIcon = (typeof FOOD_ICONS)[number];

export const TAG_FAMILIES = [
  "meal-time",
  "cycle-phase",
  "nutrient",
  "dietary",
] as const;
export type TagFamily = (typeof TAG_FAMILIES)[number];

export const MAX_FOOD_NAME_LENGTH = 80;
export const MAX_MACRO_PER_100G = 9_999.99;
export const MAX_PORTION_GRAMS = 99_999;
export const DEFAULT_PORTION_GRAMS = 100;

export const COOKING_METHODS = [
  "raw",
  "boiled",
  "grilled",
  "baked",
  "pan-fried",
  "steamed",
] as const;
export type CookingMethod = (typeof COOKING_METHODS)[number];

export const RECIPE_ICONS = [
  "soup",
  "salad",
  "sandwich",
  "pizza",
  "steak",
  "poultry",
  "fish",
  "eggs",
  "pastry",
  "pot",
  "cake",
  "ice-cream",
  "cookie",
  "donut",
  "coffee",
  "smoothie",
  "meal",
] as const;
export type RecipeIcon = (typeof RECIPE_ICONS)[number];

export const MAX_RECIPE_NAME_LENGTH = 80;
export const MIN_INGREDIENT_GRAMS = 1;
export const MAX_INGREDIENT_GRAMS = 99_999;
export const MAX_RECIPE_MINUTES = 9_999;
export const MAX_INSTRUCTIONS_LENGTH = 2_000;
