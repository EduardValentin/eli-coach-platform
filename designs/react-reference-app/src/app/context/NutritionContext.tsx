import { createContext, useContext, useState, ReactNode } from 'react';

export type FoodCategory = 'protein' | 'carb' | 'fat' | 'legume' | 'extra' | 'seasoning';

export type FoodIcon =
  | 'egg' | 'poultry' | 'meat' | 'fish' | 'ham' | 'dairy' | 'grain' | 'bread' | 'sandwich'
  | 'root-veg' | 'leafy' | 'veg' | 'herb' | 'apple' | 'banana' | 'citrus' | 'cherry' | 'grape'
  | 'legume' | 'nut' | 'oil' | 'chocolate' | 'candy' | 'ice-cream' | 'cake' | 'soup' | 'drink' | 'other';

export type TagFamily = 'meal-time' | 'cycle-phase' | 'nutrient' | 'dietary';

export interface Tag {
  id: string;
  family: TagFamily;
  label: string;
}

export interface Food {
  id: string;
  name: string;
  category: FoodCategory;
  icon?: FoodIcon;
  // reference macros per 100 g
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
  tagIds: string[];
  defaultPortionGrams: number;
  equivalenceGroupId?: string;
}

export interface EquivalenceGroup {
  id: string;
  name: string;
}

export type CookingMethod = 'raw' | 'boiled' | 'grilled' | 'baked' | 'pan-fried' | 'steamed';

export interface RecipeIngredient {
  foodId: string;
  grams: number;
  method: CookingMethod;
}

export interface RecipeMacros {
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
}

export interface Recipe {
  id: string;
  name: string;
  ingredients: RecipeIngredient[];
  prepMinutes: number;
  cookMinutes: number;
  mealRoleIds: string[]; // meal-time tag ids (a recipe's role: breakfast/lunch/…)
  tagIds: string[];      // cycle-phase / nutrient / dietary tag ids
  macroOverride?: RecipeMacros;
}

export const COOKING_METHODS: CookingMethod[] = [
  'raw', 'boiled', 'grilled', 'baked', 'pan-fried', 'steamed',
];

// Recipe-Library calorie-band filters: a recipe matches a band when its total kcal <= band.
export const CALORIE_BANDS = [200, 500, 600] as const;

export function computeRecipeMacros(ingredients: RecipeIngredient[], foods: Food[]): RecipeMacros {
  const total = ingredients.reduce(
    (acc, ing) => {
      const food = foods.find((f) => f.id === ing.foodId);
      if (!food) return acc;
      const factor = ing.grams / 100;
      acc.kcal += food.kcal * factor;
      acc.protein += food.protein * factor;
      acc.carb += food.carb * factor;
      acc.fat += food.fat * factor;
      return acc;
    },
    { kcal: 0, protein: 0, carb: 0, fat: 0 },
  );
  return {
    kcal: Math.round(total.kcal),
    protein: Math.round(total.protein),
    carb: Math.round(total.carb),
    fat: Math.round(total.fat),
  };
}

export function recipeMacros(recipe: Recipe, foods: Food[]): RecipeMacros {
  return recipe.macroOverride ?? computeRecipeMacros(recipe.ingredients, foods);
}

export const FOOD_CATEGORIES: FoodCategory[] = [
  'protein', 'carb', 'fat', 'legume', 'extra', 'seasoning',
];

export const TAG_FAMILIES: TagFamily[] = [
  'meal-time', 'cycle-phase', 'nutrient', 'dietary',
];

const MOCK_TAGS: Tag[] = [
  { id: 'mt-breakfast', family: 'meal-time', label: 'Breakfast' },
  { id: 'mt-lunch', family: 'meal-time', label: 'Lunch' },
  { id: 'mt-dinner', family: 'meal-time', label: 'Dinner' },
  { id: 'mt-snack', family: 'meal-time', label: 'Snack' },
  { id: 'mt-pre-workout', family: 'meal-time', label: 'Pre-workout' },
  { id: 'mt-post-workout', family: 'meal-time', label: 'Post-workout' },
  { id: 'cp-menstrual', family: 'cycle-phase', label: 'Menstrual' },
  { id: 'cp-follicular', family: 'cycle-phase', label: 'Follicular' },
  { id: 'cp-ovulatory', family: 'cycle-phase', label: 'Ovulatory' },
  { id: 'cp-luteal', family: 'cycle-phase', label: 'Luteal' },
  { id: 'nu-iron', family: 'nutrient', label: 'Iron-rich' },
  { id: 'nu-omega3', family: 'nutrient', label: 'Omega-3' },
  { id: 'nu-magnesium', family: 'nutrient', label: 'Magnesium' },
  { id: 'nu-anti-inflammatory', family: 'nutrient', label: 'Anti-inflammatory' },
  { id: 'di-vegetarian', family: 'dietary', label: 'Vegetarian' },
  { id: 'di-lactose-free', family: 'dietary', label: 'Lactose-free' },
];

const MOCK_EQUIVALENCE_GROUPS: EquivalenceGroup[] = [
  { id: 'eg-lean-proteins', name: 'Lean proteins' },
  { id: 'eg-complex-carbs', name: 'Complex carbs' },
];

const MOCK_FOODS: Food[] = [
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
];

const MOCK_RECIPES: Recipe[] = [
  {
    id: 'recipe-chicken-rice-bowl',
    name: 'Chicken rice bowl',
    ingredients: [
      { foodId: 'food-chicken', grams: 150, method: 'grilled' },
      { foodId: 'food-white-rice', grams: 150, method: 'boiled' },
      { foodId: 'food-olive-oil', grams: 10, method: 'pan-fried' },
    ],
    prepMinutes: 10,
    cookMinutes: 20,
    mealRoleIds: ['mt-lunch', 'mt-dinner'],
    tagIds: ['nu-iron'],
  },
  {
    id: 'recipe-yogurt-oats',
    name: 'Greek yogurt & oats',
    ingredients: [
      { foodId: 'food-greek-yogurt', grams: 170, method: 'raw' },
      { foodId: 'food-oats', grams: 50, method: 'raw' },
    ],
    prepMinutes: 5,
    cookMinutes: 0,
    mealRoleIds: ['mt-breakfast'],
    tagIds: ['nu-magnesium', 'di-vegetarian'],
  },
  {
    id: 'recipe-salmon-sweet-potato',
    name: 'Salmon & sweet potato',
    ingredients: [
      { foodId: 'food-salmon', grams: 150, method: 'baked' },
      { foodId: 'food-sweet-potato', grams: 200, method: 'baked' },
      { foodId: 'food-olive-oil', grams: 10, method: 'pan-fried' },
    ],
    prepMinutes: 10,
    cookMinutes: 25,
    mealRoleIds: ['mt-dinner'],
    tagIds: ['nu-omega3', 'nu-anti-inflammatory', 'cp-luteal'],
  },
];

interface NutritionContextType {
  foods: Food[];
  tags: Tag[];
  equivalenceGroups: EquivalenceGroup[];
  getFood(id: string): Food | undefined;
  addFood(input: Omit<Food, 'id'>): Food;
  updateFood(id: string, patch: Partial<Omit<Food, 'id'>>): void;
  deleteFood(id: string): void;
  addFoodTag(foodId: string, tagId: string): void;
  removeFoodTag(foodId: string, tagId: string): void;
  addEquivalenceGroup(name: string): EquivalenceGroup;
  assignFoodToGroup(foodId: string, groupId: string | null): void;
  recipes: Recipe[];
  getRecipe(id: string): Recipe | undefined;
  addRecipe(input: Omit<Recipe, 'id'>): Recipe;
  updateRecipe(id: string, patch: Partial<Omit<Recipe, 'id'>>): void;
  deleteRecipe(id: string): void;
}

const NutritionContext = createContext<NutritionContextType | null>(null);

export function NutritionProvider({ children }: { children: ReactNode }) {
  const [foods, setFoods] = useState<Food[]>(MOCK_FOODS);
  const [tags] = useState<Tag[]>(MOCK_TAGS);
  const [equivalenceGroups, setEquivalenceGroups] = useState<EquivalenceGroup[]>(MOCK_EQUIVALENCE_GROUPS);
  const [recipes, setRecipes] = useState<Recipe[]>(MOCK_RECIPES);

  const getRecipe = (id: string) => recipes.find((r) => r.id === id);

  const addRecipe = (input: Omit<Recipe, 'id'>): Recipe => {
    const recipe: Recipe = { ...input, id: `recipe-${crypto.randomUUID()}` };
    setRecipes((prev) => [...prev, recipe]);
    return recipe;
  };

  const updateRecipe = (id: string, patch: Partial<Omit<Recipe, 'id'>>) => {
    setRecipes((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch, id } : r)));
  };

  const deleteRecipe = (id: string) => {
    setRecipes((prev) => prev.filter((r) => r.id !== id));
  };

  const getFood = (id: string) => foods.find((f) => f.id === id);

  const addFood = (input: Omit<Food, 'id'>): Food => {
    const food: Food = { ...input, id: `food-${crypto.randomUUID()}` };
    setFoods((prev) => [...prev, food]);
    return food;
  };

  const updateFood = (id: string, patch: Partial<Omit<Food, 'id'>>) => {
    setFoods((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch, id } : f)));
  };

  const deleteFood = (id: string) => {
    setFoods((prev) => prev.filter((f) => f.id !== id));
  };

  const addFoodTag = (foodId: string, tagId: string) => {
    setFoods((prev) => prev.map((f) =>
      f.id === foodId && !f.tagIds.includes(tagId)
        ? { ...f, tagIds: [...f.tagIds, tagId] }
        : f,
    ));
  };

  const removeFoodTag = (foodId: string, tagId: string) => {
    setFoods((prev) => prev.map((f) =>
      f.id === foodId ? { ...f, tagIds: f.tagIds.filter((t) => t !== tagId) } : f,
    ));
  };

  const addEquivalenceGroup = (name: string): EquivalenceGroup => {
    const group: EquivalenceGroup = { id: `eg-${crypto.randomUUID()}`, name };
    setEquivalenceGroups((prev) => [...prev, group]);
    return group;
  };

  const assignFoodToGroup = (foodId: string, groupId: string | null) => {
    setFoods((prev) => prev.map((f) =>
      f.id === foodId ? { ...f, equivalenceGroupId: groupId ?? undefined } : f,
    ));
  };

  return (
    <NutritionContext.Provider
      value={{
        foods, tags, equivalenceGroups,
        getFood, addFood, updateFood, deleteFood,
        addFoodTag, removeFoodTag,
        addEquivalenceGroup, assignFoodToGroup,
        recipes, getRecipe, addRecipe, updateRecipe, deleteRecipe,
      }}
    >
      {children}
    </NutritionContext.Provider>
  );
}

export function useNutrition() {
  const ctx = useContext(NutritionContext);
  if (!ctx) throw new Error('useNutrition must be used within NutritionProvider');
  return ctx;
}
