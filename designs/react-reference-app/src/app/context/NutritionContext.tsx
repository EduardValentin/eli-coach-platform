import { createContext, useContext, useState, ReactNode } from 'react';
import type { CyclePhase } from './CycleContext';
import { phaseForDate } from './CycleContext';

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

export interface DailyTarget { kcal: number; protein: number; carb: number; fat: number }

export interface MealSlot {
  id: string;                     // unique within the plan (stable across copies)
  mealRoleId: string;             // meal-time tag id: mt-breakfast | mt-lunch | mt-dinner | mt-snack
  suggestedKcal: number;          // soft budget (% split of the day target)
  recipeId?: string;
  portionScale: number;           // multiplier to hit the budget (default 1)
  alternativeRecipeIds: string[]; // slot-level whole-recipe alternatives (used in sub-slice 3b)
}

export interface PlanDay {
  date: string;                   // ISO yyyy-mm-dd
  phase?: CyclePhase;             // stamped from cycle data; undefined for non-cycling clients
  slots: MealSlot[];
}

export interface BlockReview {    // mocked/lightweight (used in sub-slice 3b)
  adherencePct: number;
  swapsUsed: number;
  clientFeedbackNote?: string;
}

export interface PlanBlock {
  id: string;
  startDate: string;              // 14-day span
  days: PlanDay[];
  status: 'active' | 'past';
  review?: BlockReview;
}

export interface ClientNutritionPlan {
  clientId: string;
  dailyTarget: DailyTarget;                                   // seeded from profile
  phaseTargetOverrides?: Partial<Record<CyclePhase, DailyTarget>>; // optional per-phase override
  blocks: PlanBlock[];
}

export interface ClientFoodPreferences {                      // replaces free-text dietaryRestrictions (3b/3d)
  clientId: string;
  dietaryFlags: string[];
  allergens: string[];
  dislikedFoodIds: string[];
}

export const COOKING_METHODS: CookingMethod[] = [
  'raw', 'boiled', 'grilled', 'baked', 'pan-fried', 'steamed',
];

// Recipe-Library calorie-band filters: a recipe matches a band when its total kcal <= band.
export const CALORIE_BANDS = [200, 500, 600] as const;

// Default per-day meal slots and their soft kcal budget split (sums to 1.0).
export const DEFAULT_MEAL_ROLES: string[] = ['mt-breakfast', 'mt-lunch', 'mt-dinner', 'mt-snack'];
export const MEAL_ROLE_KCAL_SPLIT: Record<string, number> = {
  'mt-breakfast': 0.25, 'mt-lunch': 0.30, 'mt-dinner': 0.30, 'mt-snack': 0.15,
};

export function seedDailyTarget(p: { dailyCalories: number; proteinGrams: number; carbsGrams: number; fatsGrams: number }): DailyTarget {
  return { kcal: p.dailyCalories, protein: p.proteinGrams, carb: p.carbsGrams, fat: p.fatsGrams };
}

// Sum of placed recipes in a day, each scaled by its portionScale.
export function dayMacros(day: PlanDay, recipes: Recipe[], foods: Food[]): DailyTarget {
  return day.slots.reduce<DailyTarget>((acc, slot) => {
    if (!slot.recipeId) return acc;
    const recipe = recipes.find((r) => r.id === slot.recipeId);
    if (!recipe) return acc;
    const m = recipeMacros(recipe, foods);
    acc.kcal += Math.round(m.kcal * slot.portionScale);
    acc.protein += Math.round(m.protein * slot.portionScale);
    acc.carb += Math.round(m.carb * slot.portionScale);
    acc.fat += Math.round(m.fat * slot.portionScale);
    return acc;
  }, { kcal: 0, protein: 0, carb: 0, fat: 0 });
}

// The effective daily target for a day in a phase (per-phase override wins).
export function dayTargetFor(plan: ClientNutritionPlan, phase?: CyclePhase): DailyTarget {
  if (phase && plan.phaseTargetOverrides?.[phase]) return plan.phaseTargetOverrides[phase]!;
  return plan.dailyTarget;
}

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

export function isoLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function isoNDaysAgo(n: number): string { const d = new Date(); d.setDate(d.getDate() - n); return isoLocal(d); }
function isoToday(): string { return isoLocal(new Date()); }
function isoAddDays(iso: string, n: number): string { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return isoLocal(d); }
let slotSeq = 0;
function newSlotId(): string { return `slot-${++slotSeq}`; }

function buildEmptyDay(dateISO: string, phase: CyclePhase | undefined, target: DailyTarget): PlanDay {
  return {
    date: dateISO,
    phase,
    slots: DEFAULT_MEAL_ROLES.map((roleId) => ({
      id: newSlotId(),
      mealRoleId: roleId,
      suggestedKcal: Math.round(target.kcal * (MEAL_ROLE_KCAL_SPLIT[roleId] ?? 0)),
      portionScale: 1,
      alternativeRecipeIds: [],
    })),
  };
}

// 14-day active block; dayPhases[i] is the phase for day i (undefined for non-cycling).
function buildBlock(startISO: string, dayPhases: (CyclePhase | undefined)[], target: DailyTarget): PlanBlock {
  const days: PlanDay[] = Array.from({ length: 14 }, (_, i) =>
    buildEmptyDay(isoAddDays(startISO, i), dayPhases[i], target),
  );
  return { id: `block-${crypto.randomUUID()}`, startDate: startISO, days, status: 'active' };
}

// Pre-populate the demo block so the prototype opens with a realistic plan (Snack left open
// so the empty-slot affordance + an under-target meter are both visible).
const DEMO_FILL_BY_ROLE: Record<string, string> = {
  'mt-breakfast': 'recipe-yogurt-oats',
  'mt-lunch': 'recipe-chicken-rice-bowl',
  'mt-dinner': 'recipe-salmon-sweet-potato',
};
function demoFillBlock(block: PlanBlock): PlanBlock {
  return {
    ...block,
    days: block.days.map((d) => ({
      ...d,
      slots: d.slots.map((s) =>
        DEMO_FILL_BY_ROLE[s.mealRoleId] ? { ...s, recipeId: DEMO_FILL_BY_ROLE[s.mealRoleId] } : s,
      ),
    })),
  };
}

// Mock active plan for client-1 (Jane Doe), phase-stamped from her cycle anchor (last period ~21d ago, 28d cycle).
const MOCK_PLAN_ANCHOR = isoNDaysAgo(21);
const MOCK_PLAN_START = isoToday();
const MOCK_PLAN_TARGET: DailyTarget = { kcal: 1900, protein: 140, carb: 180, fat: 60 };
const MOCK_PLAN_PHASES: (CyclePhase | undefined)[] = Array.from({ length: 14 }, (_, i) =>
  phaseForDate(isoAddDays(MOCK_PLAN_START, i), MOCK_PLAN_ANCHOR, 28),
);
const MOCK_PLANS: ClientNutritionPlan[] = [
  {
    clientId: 'client-1',
    dailyTarget: MOCK_PLAN_TARGET,
    blocks: [demoFillBlock(buildBlock(MOCK_PLAN_START, MOCK_PLAN_PHASES, MOCK_PLAN_TARGET))],
  },
];

const MOCK_PREFERENCES: ClientFoodPreferences[] = [
  { clientId: 'client-1', dietaryFlags: ['di-lactose-free'], allergens: [], dislikedFoodIds: ['food-tofu'] },
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
  getPlan(clientId: string): ClientNutritionPlan | undefined;
  getPreferences(clientId: string): ClientFoodPreferences | undefined;
  createBlock(clientId: string, target: DailyTarget, dayPhases: (CyclePhase | undefined)[]): void;
  setSlotRecipe(clientId: string, blockId: string, date: string, slotId: string, recipeId?: string): void;
  setSlotPortion(clientId: string, blockId: string, date: string, slotId: string, portionScale: number): void;
  copyDayToPhase(clientId: string, blockId: string, sourceDate: string): void;
  setPhaseTargetOverride(clientId: string, phase: CyclePhase, target: DailyTarget | null): void;
}

const NutritionContext = createContext<NutritionContextType | null>(null);

export function NutritionProvider({ children }: { children: ReactNode }) {
  const [foods, setFoods] = useState<Food[]>(MOCK_FOODS);
  const [tags] = useState<Tag[]>(MOCK_TAGS);
  const [equivalenceGroups, setEquivalenceGroups] = useState<EquivalenceGroup[]>(MOCK_EQUIVALENCE_GROUPS);
  const [recipes, setRecipes] = useState<Recipe[]>(MOCK_RECIPES);
  const [plans, setPlans] = useState<ClientNutritionPlan[]>(MOCK_PLANS);
  const [preferences] = useState<ClientFoodPreferences[]>(MOCK_PREFERENCES);

  const resolveClientId = (id: string) => (id === 'c1' ? 'client-1' : id);
  const getPlan = (clientId: string) => plans.find((p) => p.clientId === resolveClientId(clientId));
  const getPreferences = (clientId: string) => preferences.find((p) => p.clientId === resolveClientId(clientId));

  const updateBlockDay = (
    clientId: string, blockId: string, date: string,
    fn: (day: PlanDay) => PlanDay,
  ) => {
    const cid = resolveClientId(clientId);
    setPlans((prev) => prev.map((plan) => plan.clientId !== cid ? plan : {
      ...plan,
      blocks: plan.blocks.map((b) => b.id !== blockId ? b : {
        ...b,
        days: b.days.map((d) => d.date !== date ? d : fn(d)),
      }),
    }));
  };

  const createBlock = (clientId: string, target: DailyTarget, dayPhases: (CyclePhase | undefined)[]) => {
    const cid = resolveClientId(clientId);
    const block = buildBlock(isoToday(), dayPhases, target);
    setPlans((prev) => {
      const existing = prev.find((p) => p.clientId === cid);
      if (existing) {
        return prev.map((p) => p.clientId !== cid ? p : { ...p, blocks: [...p.blocks.map((b) => ({ ...b, status: 'past' as const })), block] });
      }
      return [...prev, { clientId: cid, dailyTarget: target, blocks: [block] }];
    });
  };

  const setSlotRecipe = (clientId: string, blockId: string, date: string, slotId: string, recipeId?: string) =>
    updateBlockDay(clientId, blockId, date, (day) => ({
      ...day,
      slots: day.slots.map((s) => s.id === slotId ? { ...s, recipeId, portionScale: recipeId ? s.portionScale : 1 } : s),
    }));

  const setSlotPortion = (clientId: string, blockId: string, date: string, slotId: string, portionScale: number) =>
    updateBlockDay(clientId, blockId, date, (day) => ({
      ...day,
      slots: day.slots.map((s) => s.id === slotId ? { ...s, portionScale } : s),
    }));

  const copyDayToPhase = (clientId: string, blockId: string, sourceDate: string) => {
    const cid = resolveClientId(clientId);
    setPlans((prev) => prev.map((plan) => {
      if (plan.clientId !== cid) return plan;
      return {
        ...plan,
        blocks: plan.blocks.map((b) => {
          if (b.id !== blockId) return b;
          const source = b.days.find((d) => d.date === sourceDate);
          if (!source) return b;
          return {
            ...b,
            days: b.days.map((d) => {
              if (d.date === sourceDate || d.phase !== source.phase) return d;
              return { ...d, slots: source.slots.map((s) => ({ ...s, id: newSlotId(), alternativeRecipeIds: [...s.alternativeRecipeIds] })) };
            }),
          };
        }),
      };
    }));
  };

  const setPhaseTargetOverride = (clientId: string, phase: CyclePhase, target: DailyTarget | null) => {
    const cid = resolveClientId(clientId);
    setPlans((prev) => prev.map((plan) => {
      if (plan.clientId !== cid) return plan;
      const next = { ...(plan.phaseTargetOverrides ?? {}) };
      if (target) next[phase] = target; else delete next[phase];
      return { ...plan, phaseTargetOverrides: next };
    }));
  };

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
        getPlan, getPreferences, createBlock, setSlotRecipe, setSlotPortion, copyDayToPhase, setPhaseTargetOverride,
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
