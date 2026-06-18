import { createContext, useContext, useState, ReactNode } from 'react';

export type FoodCategory = 'protein' | 'carb' | 'fat' | 'legume' | 'extra' | 'seasoning';

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
  { id: 'food-chicken', name: 'Chicken breast', category: 'protein', kcal: 165, protein: 31, carb: 0, fat: 3.6, defaultPortionGrams: 150, tagIds: ['mt-lunch', 'mt-dinner', 'mt-post-workout'], equivalenceGroupId: 'eg-lean-proteins' },
  { id: 'food-eggs', name: 'Eggs', category: 'protein', kcal: 155, protein: 13, carb: 1.1, fat: 11, defaultPortionGrams: 100, tagIds: ['mt-breakfast', 'di-vegetarian'], equivalenceGroupId: 'eg-lean-proteins' },
  { id: 'food-tofu', name: 'Tofu', category: 'protein', kcal: 144, protein: 17, carb: 3, fat: 9, defaultPortionGrams: 150, tagIds: ['di-vegetarian', 'di-lactose-free'], equivalenceGroupId: 'eg-lean-proteins' },
  { id: 'food-greek-yogurt', name: 'Greek yogurt', category: 'protein', kcal: 59, protein: 10, carb: 3.6, fat: 0.4, defaultPortionGrams: 170, tagIds: ['mt-breakfast', 'mt-snack'] },
  { id: 'food-salmon', name: 'Salmon', category: 'protein', kcal: 208, protein: 20, carb: 0, fat: 13, defaultPortionGrams: 150, tagIds: ['mt-dinner', 'nu-omega3', 'nu-anti-inflammatory'] },
  { id: 'food-white-rice', name: 'White rice', category: 'carb', kcal: 130, protein: 2.7, carb: 28, fat: 0.3, defaultPortionGrams: 150, tagIds: ['mt-lunch', 'mt-dinner'], equivalenceGroupId: 'eg-complex-carbs' },
  { id: 'food-oats', name: 'Oats', category: 'carb', kcal: 389, protein: 17, carb: 66, fat: 7, defaultPortionGrams: 50, tagIds: ['mt-breakfast', 'nu-magnesium'], equivalenceGroupId: 'eg-complex-carbs' },
  { id: 'food-sweet-potato', name: 'Sweet potato', category: 'carb', kcal: 86, protein: 1.6, carb: 20, fat: 0.1, defaultPortionGrams: 200, tagIds: ['mt-dinner', 'cp-luteal'], equivalenceGroupId: 'eg-complex-carbs' },
  { id: 'food-olive-oil', name: 'Olive oil', category: 'fat', kcal: 884, protein: 0, carb: 0, fat: 100, defaultPortionGrams: 10, tagIds: ['nu-anti-inflammatory'] },
  { id: 'food-avocado', name: 'Avocado', category: 'fat', kcal: 160, protein: 2, carb: 9, fat: 15, defaultPortionGrams: 100, tagIds: ['nu-magnesium', 'cp-ovulatory'] },
  { id: 'food-lentils', name: 'Lentils', category: 'legume', kcal: 116, protein: 9, carb: 20, fat: 0.4, defaultPortionGrams: 150, tagIds: ['nu-iron', 'di-vegetarian', 'di-lactose-free'] },
  { id: 'food-dark-chocolate', name: 'Dark chocolate', category: 'extra', kcal: 546, protein: 5, carb: 61, fat: 31, defaultPortionGrams: 20, tagIds: ['mt-snack', 'nu-magnesium'] },
  { id: 'food-turmeric', name: 'Turmeric', category: 'seasoning', kcal: 0, protein: 0, carb: 0, fat: 0, defaultPortionGrams: 2, tagIds: ['nu-anti-inflammatory'] },
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
}

const NutritionContext = createContext<NutritionContextType | null>(null);

export function NutritionProvider({ children }: { children: ReactNode }) {
  const [foods, setFoods] = useState<Food[]>(MOCK_FOODS);
  const [tags] = useState<Tag[]>(MOCK_TAGS);
  const [equivalenceGroups, setEquivalenceGroups] = useState<EquivalenceGroup[]>(MOCK_EQUIVALENCE_GROUPS);

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
