import type { Food, Recipe } from '../context/NutritionContext';

export const FOOD_SEEDS = ['seeded', 'empty'] as const;
export type FoodSeed = (typeof FOOD_SEEDS)[number];

const SAMPLE_FOODS: readonly Food[] = [
  { id: 'food-chicken', name: 'Chicken breast', category: 'protein', icon: 'poultry', kcal: 165, protein: 31, carb: 0, fat: 3.6, defaultPortionGrams: 150, tagIds: ['mt-lunch', 'mt-dinner', 'mt-post-workout'], equivalenceGroupId: 'eg-lean-proteins' },
  { id: 'food-eggs', name: 'Eggs', category: 'protein', icon: 'egg', kcal: 155, protein: 13, carb: 1.1, fat: 11, defaultPortionGrams: 100, tagIds: ['mt-breakfast', 'di-vegetarian'], equivalenceGroupId: 'eg-lean-proteins' },
  { id: 'food-tofu', name: 'Tofu', category: 'protein', icon: 'legume', kcal: 144, protein: 17, carb: 3, fat: 9, defaultPortionGrams: 150, tagIds: ['di-vegetarian', 'di-lactose-free'], equivalenceGroupId: 'eg-lean-proteins' },
  { id: 'food-greek-yogurt', name: 'Greek yogurt', category: 'protein', icon: 'dairy', kcal: 59, protein: 10, carb: 3.6, fat: 0.4, defaultPortionGrams: 170, tagIds: ['mt-breakfast', 'mt-snack'] },
  { id: 'food-salmon', name: 'Salmon', category: 'protein', icon: 'fish', kcal: 208, protein: 20, carb: 0, fat: 13, defaultPortionGrams: 150, tagIds: ['mt-dinner', 'nu-omega3', 'nu-anti-inflammatory'] },
  { id: 'food-white-rice', name: 'White rice', category: 'carb', icon: 'grain', kcal: 130, protein: 2.7, carb: 28, fat: 0.3, defaultPortionGrams: 150, tagIds: ['mt-lunch', 'mt-dinner'], equivalenceGroupId: 'eg-complex-carbs' },
  { id: 'food-oats', name: 'Oats', category: 'carb', icon: 'grain', kcal: 389, protein: 17, carb: 66, fat: 7, defaultPortionGrams: 50, tagIds: ['mt-breakfast', 'nu-magnesium'], equivalenceGroupId: 'eg-complex-carbs' },
  { id: 'food-sweet-potato', name: 'Sweet potato', category: 'carb', icon: 'root-veg', kcal: 86, protein: 1.6, carb: 20, fat: 0.1, defaultPortionGrams: 200, tagIds: ['mt-dinner', 'cp-luteal'], equivalenceGroupId: 'eg-complex-carbs' },
  { id: 'food-olive-oil', name: 'Olive oil', category: 'fat', icon: 'oil', kcal: 884, protein: 0, carb: 0, fat: 100, defaultPortionGrams: 10, tagIds: ['nu-anti-inflammatory'] },
  { id: 'food-avocado', name: 'Avocado', category: 'fat', icon: 'apple', kcal: 160, protein: 2, carb: 9, fat: 15, defaultPortionGrams: 100, tagIds: ['nu-magnesium', 'cp-ovulatory'] },
  { id: 'food-lentils', name: 'Lentils', category: 'legume', icon: 'legume', kcal: 116, protein: 9, carb: 20, fat: 0.4, defaultPortionGrams: 150, tagIds: ['nu-iron', 'di-vegetarian', 'di-lactose-free'] },
  { id: 'food-dark-chocolate', name: 'Dark chocolate', category: 'extra', icon: 'chocolate', kcal: 546, protein: 5, carb: 61, fat: 31, defaultPortionGrams: 20, tagIds: ['mt-snack', 'nu-magnesium'] },
  { id: 'food-turmeric', name: 'Turmeric', category: 'seasoning', icon: 'herb', kcal: 0, protein: 0, carb: 0, fat: 0, defaultPortionGrams: 2, tagIds: ['nu-anti-inflammatory'] },
  { id: 'food-rice-cakes', name: 'Rice cakes', category: 'carb', icon: 'grain', kcal: 387, protein: 8, carb: 81, fat: 2.8, defaultPortionGrams: 20, tagIds: ['mt-snack'], archivedAt: '2026-09-28T10:00:00.000Z' },
];

const RECIPE_PHOTO_ROOT = `${import.meta.env.BASE_URL}media/recipes/`;

const SAMPLE_RECIPES: readonly Recipe[] = [
  {
    id: 'recipe-chicken-rice-bowl',
    name: 'Chicken rice bowl',
    icon: 'poultry',
    imageUrl: `${RECIPE_PHOTO_ROOT}chicken-rice-bowl.jpg`,
    ingredients: [
      { foodId: 'food-chicken', grams: 150, method: 'grilled' },
      { foodId: 'food-white-rice', grams: 150, method: 'boiled' },
      { foodId: 'food-olive-oil', grams: 10, method: 'pan-fried' },
    ],
    prepMinutes: 10,
    cookMinutes: 20,
    instructions: 'Season the chicken and grill 6–7 minutes per side until cooked through. Boil the rice per package instructions. Slice the chicken, plate over rice, and finish with a drizzle of olive oil.',
    mealRoleIds: ['mt-lunch', 'mt-dinner'],
    tagIds: ['nu-iron'],
  },
  {
    id: 'recipe-yogurt-oats',
    name: 'Greek yogurt & oats',
    icon: 'pastry',
    ingredients: [
      { foodId: 'food-greek-yogurt', grams: 170, method: 'raw' },
      { foodId: 'food-oats', grams: 50, method: 'raw' },
    ],
    prepMinutes: 5,
    cookMinutes: 0,
    instructions: 'Stir the oats into the Greek yogurt and let sit 5 minutes to soften (or overnight in the fridge). Top with fruit or seeds if desired.',
    mealRoleIds: ['mt-breakfast'],
    tagIds: ['nu-magnesium', 'di-vegetarian'],
  },
  {
    id: 'recipe-salmon-sweet-potato',
    name: 'Salmon & sweet potato',
    icon: 'fish',
    imageUrl: `${RECIPE_PHOTO_ROOT}salmon-sweet-potato.jpg`,
    ingredients: [
      { foodId: 'food-salmon', grams: 150, method: 'baked' },
      { foodId: 'food-sweet-potato', grams: 200, method: 'baked' },
      { foodId: 'food-olive-oil', grams: 10, method: 'pan-fried' },
    ],
    prepMinutes: 10,
    cookMinutes: 25,
    instructions: 'Preheat the oven to 200°C. Brush the salmon and sweet potato with olive oil and season to taste. Bake the sweet potato for 25 minutes and the salmon for the final 15 minutes until flaky and tender.',
    mealRoleIds: ['mt-dinner'],
    tagIds: ['nu-omega3', 'nu-anti-inflammatory', 'cp-luteal'],
  },
  {
    id: 'recipe-rice-cake-stack',
    name: 'Rice cake & yogurt stack',
    icon: 'pastry',
    ingredients: [
      { foodId: 'food-rice-cakes', grams: 20, method: 'raw' },
      { foodId: 'food-greek-yogurt', grams: 100, method: 'raw' },
    ],
    prepMinutes: 5,
    cookMinutes: 0,
    instructions: 'Spread the Greek yogurt over the rice cakes and top with fruit.',
    mealRoleIds: ['mt-snack'],
    tagIds: [],
    archivedAt: '2026-09-28T10:00:00.000Z',
  },
];

export function foodsForSeed(seed: FoodSeed): Food[] {
  return seed === 'seeded' ? [...SAMPLE_FOODS] : [];
}

export function recipesForSeed(seed: FoodSeed): Recipe[] {
  return seed === 'seeded' ? [...SAMPLE_RECIPES] : [];
}
