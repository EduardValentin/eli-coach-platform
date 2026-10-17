import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { CyclePhase } from './CycleContext';
import { phaseForDate } from './CycleContext';
import { useAppState } from './AppContext';
import { foodsForSeed, recipesForSeed } from '../services/foodSamples';
import { computeRecipeMacros } from '../domain/recipes';
import type { RecipeIcon } from '../components/coach-portal/nutrition/recipe-icons';
import {
  archivedItem,
  foodUsage,
  isDeletable,
  recipeUsage,
  restoredItemIn,
  type LibraryDeletion,
  type LibraryUsage,
} from '../domain/libraryLifecycle';

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
  archivedAt?: string;
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
  instructions: string;
  mealRoleIds: string[]; // meal-time tag ids (a recipe's role: breakfast/lunch/…)
  tagIds: string[];      // cycle-phase / nutrient / dietary tag ids
  macroOverride?: RecipeMacros;
  imageUrl?: string;     // data-URL from client-side FileReader (mocked, no backend)
  icon?: RecipeIcon;     // meal-type icon shown when no imageUrl is set
  archivedAt?: string;
}

export interface DailyTarget { kcal: number; protein: number; carb: number; fat: number }

export interface MealSlot {
  id: string;                     // unique within the plan (stable across copies)
  mealRoleId: string;             // meal-time tag id: mt-breakfast | mt-lunch | mt-dinner | mt-snack
  suggestedKcal: number;          // soft budget (% split of the day target)
  recipeId?: string;
  clientSelectedRecipeId?: string; // client's chosen alternative; undefined = use coach default recipeId
  portionScale: number;           // multiplier to hit the budget (default 1)
  alternativeRecipeIds: string[]; // slot-level whole-recipe alternatives (used in sub-slice 3b)
  ingredientSwaps?: Record<string, string>; // originalFoodId -> replacementFoodId (applied only when effective recipe is the coach primary)
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

// Default per-day meal slots and their soft kcal budget split (sums to 1.0).
export const DEFAULT_MEAL_ROLES: string[] = ['mt-breakfast', 'mt-lunch', 'mt-dinner', 'mt-snack'];
export const MEAL_ROLE_KCAL_SPLIT: Record<string, number> = {
  'mt-breakfast': 0.25, 'mt-lunch': 0.30, 'mt-dinner': 0.30, 'mt-snack': 0.15,
};

export function seedDailyTarget(p: { dailyCalories: number; proteinGrams: number; carbsGrams: number; fatsGrams: number }): DailyTarget {
  return { kcal: p.dailyCalories, protein: p.proteinGrams, carb: p.carbsGrams, fat: p.fatsGrams };
}

// Grams of `toFood` that preserve `fromFood`'s kcal contribution at `grams` (falls back to same grams if toFood has 0 kcal).
export function rescaleGrams(fromFood: Food, toFood: Food, grams: number): number {
  const fromKcal = (fromFood.kcal / 100) * grams;
  if (toFood.kcal <= 0) return grams;
  return Math.round((fromKcal / toFood.kcal) * 100);
}

// Equivalence-group siblings of a food (same equivalenceGroupId, excluding itself).
export function groupSiblings(food: Food, foods: Food[]): Food[] {
  if (!food.equivalenceGroupId) return [];
  return foods.filter((f) => f.id !== food.id && f.equivalenceGroupId === food.equivalenceGroupId);
}

// Resolve the effective recipe id for a slot: client's choice if set, otherwise the coach's primary.
export function effectiveRecipeId(slot: MealSlot): string | undefined {
  return slot.clientSelectedRecipeId ?? slot.recipeId;
}

// A slot's macros: its effective recipe scaled by portionScale.
// ingredientSwaps are applied ONLY when the effective recipe is the coach's primary (clientSelectedRecipeId is unset
// or equals recipeId), preserving the coach's set when a client picks an alternative.
export function slotMacros(slot: MealSlot, recipes: Recipe[], foods: Food[]): RecipeMacros {
  const effId = effectiveRecipeId(slot);
  if (!effId) return { kcal: 0, protein: 0, carb: 0, fat: 0 };
  const recipe = recipes.find((r) => r.id === effId);
  if (!recipe) return { kcal: 0, protein: 0, carb: 0, fat: 0 };
  // Apply ingredientSwaps only when the effective recipe is the coach primary
  const applySwaps = !slot.clientSelectedRecipeId || slot.clientSelectedRecipeId === slot.recipeId;
  const swapped: Recipe = {
    ...recipe,
    ingredients: applySwaps
      ? recipe.ingredients.map((ing) => {
          const toId = slot.ingredientSwaps?.[ing.foodId];
          if (!toId) return ing;
          const fromFood = foods.find((f) => f.id === ing.foodId);
          const toFood = foods.find((f) => f.id === toId);
          if (!fromFood || !toFood) return ing;
          return { ...ing, foodId: toId, grams: rescaleGrams(fromFood, toFood, ing.grams) };
        })
      : recipe.ingredients,
    macroOverride: applySwaps && slot.ingredientSwaps && Object.keys(slot.ingredientSwaps).length
      ? undefined
      : recipe.macroOverride,
  };
  const base = recipeMacros(swapped, foods);
  return {
    kcal: Math.round(base.kcal * slot.portionScale),
    protein: Math.round(base.protein * slot.portionScale),
    carb: Math.round(base.carb * slot.portionScale),
    fat: Math.round(base.fat * slot.portionScale),
  };
}

// Disliked ingredients present in a recipe (soft-warning reasons).
export function recipeConflicts(recipe: Recipe, prefs: ClientFoodPreferences | undefined, foods: Food[]): string[] {
  if (!prefs) return [];
  const reasons: string[] = [];
  for (const ing of recipe.ingredients) {
    if (prefs.dislikedFoodIds.includes(ing.foodId)) {
      const f = foods.find((x) => x.id === ing.foodId);
      if (f) reasons.push(f.name);
    }
  }
  return reasons;
}

// Sum of placed recipes in a day, each scaled by its portionScale (with ingredientSwaps applied via slotMacros).
export function dayMacros(day: PlanDay, recipes: Recipe[], foods: Food[]): DailyTarget {
  return day.slots.reduce<DailyTarget>((acc, slot) => {
    const m = slotMacros(slot, recipes, foods);
    acc.kcal += m.kcal;
    acc.protein += m.protein;
    acc.carb += m.carb;
    acc.fat += m.fat;
    return acc;
  }, { kcal: 0, protein: 0, carb: 0, fat: 0 });
}

// The effective daily target for a day in a phase (per-phase override wins).
export function dayTargetFor(plan: ClientNutritionPlan, phase?: CyclePhase): DailyTarget {
  if (phase && plan.phaseTargetOverrides?.[phase]) return plan.phaseTargetOverrides[phase]!;
  return plan.dailyTarget;
}

export function recipeMacros(recipe: Recipe, foods: Food[]): RecipeMacros {
  return recipe.macroOverride ?? computeRecipeMacros(recipe.ingredients, foods);
}

export const FOOD_CATEGORIES: FoodCategory[] = [
  'protein', 'carb', 'fat', 'legume', 'extra', 'seasoning',
];

export interface ShoppingItem { foodId: string; name: string; grams: number; category: FoodCategory }
export interface ShoppingGroup { category: FoodCategory; items: ShoppingItem[] }

// Aggregate ingredients across the given days' filled slots, applying ingredientSwaps + portionScale,
// summed per food and grouped by category (categories ordered by FOOD_CATEGORIES).
// Uses the effective recipe per slot (client's selection or coach primary); ingredientSwaps are applied
// only when the effective recipe is the coach primary.
export function shoppingListForDays(days: PlanDay[], recipes: Recipe[], foods: Food[]): ShoppingGroup[] {
  const totals = new Map<string, number>(); // foodId -> grams
  for (const day of days) {
    for (const slot of day.slots) {
      const effId = effectiveRecipeId(slot);
      if (!effId) continue;
      const recipe = recipes.find((r) => r.id === effId);
      if (!recipe) continue;
      const applySwaps = !slot.clientSelectedRecipeId || slot.clientSelectedRecipeId === slot.recipeId;
      for (const ing of recipe.ingredients) {
        let foodId = ing.foodId;
        let grams = ing.grams;
        if (applySwaps) {
          const toId = slot.ingredientSwaps?.[ing.foodId];
          if (toId) {
            const fromFood = foods.find((f) => f.id === ing.foodId);
            const toFood = foods.find((f) => f.id === toId);
            if (fromFood && toFood) { foodId = toId; grams = rescaleGrams(fromFood, toFood, ing.grams); }
          }
        }
        grams = Math.round(grams * slot.portionScale);
        totals.set(foodId, (totals.get(foodId) ?? 0) + grams);
      }
    }
  }
  const byCat = new Map<FoodCategory, ShoppingItem[]>();
  for (const [foodId, grams] of totals) {
    const food = foods.find((f) => f.id === foodId);
    if (!food) continue;
    const list = byCat.get(food.category) ?? [];
    list.push({ foodId, name: food.name, grams, category: food.category });
    byCat.set(food.category, list);
  }
  return FOOD_CATEGORIES
    .filter((c) => byCat.has(c))
    .map((c) => ({ category: c, items: byCat.get(c)!.slice().sort((a, b) => a.name.localeCompare(b.name)) }));
}

// Whole-block shopping list (all 14 days combined).
export function shoppingList(block: PlanBlock, recipes: Recipe[], foods: Food[]): ShoppingGroup[] {
  return shoppingListForDays(block.days, recipes, foods);
}

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
// Coach-approved alternatives seeded per meal role so the swap control demos in the portal.
// Filtered at use-time to exclude the slot's own primary recipeId.
const DEMO_ALT_BY_ROLE: Record<string, string[]> = {
  'mt-lunch': ['recipe-salmon-sweet-potato'],
};
function demoFillBlock(block: PlanBlock): PlanBlock {
  return {
    ...block,
    days: block.days.map((d) => ({
      ...d,
      slots: d.slots.map((s) => {
        const recipeId = DEMO_FILL_BY_ROLE[s.mealRoleId];
        const altIds = DEMO_ALT_BY_ROLE[s.mealRoleId]
          ? DEMO_ALT_BY_ROLE[s.mealRoleId].filter((id) => id !== recipeId)
          : undefined;
        return recipeId
          ? { ...s, recipeId, ...(altIds && altIds.length > 0 ? { alternativeRecipeIds: altIds } : {}) }
          : s;
      }),
    })),
  };
}

// Mock active plan for client-1 (Jane Doe), phase-stamped from her cycle anchor (last period ~21d ago, 28d cycle).
const MOCK_PLAN_ANCHOR = isoNDaysAgo(21);
const MOCK_PLAN_START = isoToday();
const MOCK_PLAN_TARGET: DailyTarget = { kcal: 1600, protein: 140, carb: 150, fat: 50 };
const MOCK_PLAN_PHASES: (CyclePhase | undefined)[] = Array.from({ length: 14 }, (_, i) =>
  phaseForDate(isoAddDays(MOCK_PLAN_START, i), MOCK_PLAN_ANCHOR, 28),
);
// A completed (past) block from the prior 14 days, so the coach has history to review.
const MOCK_PLAN_PAST_START = isoAddDays(MOCK_PLAN_START, -14);
const MOCK_PLAN_PAST_PHASES: (CyclePhase | undefined)[] = Array.from({ length: 14 }, (_, i) =>
  phaseForDate(isoAddDays(MOCK_PLAN_PAST_START, i), MOCK_PLAN_ANCHOR, 28),
);
const MOCK_PAST_BLOCK: PlanBlock = {
  ...demoFillBlock(buildBlock(MOCK_PLAN_PAST_START, MOCK_PLAN_PAST_PHASES, MOCK_PLAN_TARGET)),
  status: 'past',
  review: {
    adherencePct: 86,
    swapsUsed: 4,
    clientFeedbackNote: 'Hit targets most days; swapped a couple of dinners when training ran late.',
  },
};

const MOCK_PLANS: ClientNutritionPlan[] = [
  {
    clientId: 'client-1',
    dailyTarget: MOCK_PLAN_TARGET,
    blocks: [
      MOCK_PAST_BLOCK,
      demoFillBlock(buildBlock(MOCK_PLAN_START, MOCK_PLAN_PHASES, MOCK_PLAN_TARGET)),
    ],
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
  archiveFood(id: string): void;
  restoreFood(id: string): Food;
  deleteFood(id: string): LibraryDeletion;
  getFoodUsage(id: string): LibraryUsage;
  addFoodTag(foodId: string, tagId: string): void;
  removeFoodTag(foodId: string, tagId: string): void;
  addEquivalenceGroup(name: string): EquivalenceGroup;
  assignFoodToGroup(foodId: string, groupId: string | null): void;
  recipes: Recipe[];
  getRecipe(id: string): Recipe | undefined;
  addRecipe(input: Omit<Recipe, 'id'>): Recipe;
  updateRecipe(id: string, patch: Partial<Omit<Recipe, 'id'>>): void;
  archiveRecipe(id: string): void;
  restoreRecipe(id: string): Recipe;
  deleteRecipe(id: string): LibraryDeletion;
  getRecipeUsage(id: string): LibraryUsage;
  getPlan(clientId: string): ClientNutritionPlan | undefined;
  getPreferences(clientId: string): ClientFoodPreferences | undefined;
  createBlock(clientId: string, target: DailyTarget, dayPhases: (CyclePhase | undefined)[]): void;
  setSlotRecipe(clientId: string, blockId: string, date: string, slotId: string, recipeId?: string): void;
  setSlotPortion(clientId: string, blockId: string, date: string, slotId: string, portionScale: number): void;
  /** Replace an entire day's slots in one write (used to commit a drafted day). */
  saveDay(clientId: string, blockId: string, date: string, slots: MealSlot[]): void;
  copyDayToPhase(clientId: string, blockId: string, sourceDate: string): void;
  setPhaseTargetOverride(clientId: string, phase: CyclePhase, target: DailyTarget | null): void;
  setSlotIngredientSwap(clientId: string, blockId: string, date: string, slotId: string, fromFoodId: string, toFoodId: string): void;
  clearSlotIngredientSwap(clientId: string, blockId: string, date: string, slotId: string, fromFoodId: string): void;
  addSlotAlternative(clientId: string, blockId: string, date: string, slotId: string, recipeId: string): void;
  removeSlotAlternative(clientId: string, blockId: string, date: string, slotId: string, recipeId: string): void;
  setSlotSelection(clientId: string, blockId: string, date: string, slotId: string, recipeId: string): void;
  setPreferences(clientId: string, patch: Partial<Omit<ClientFoodPreferences, 'clientId'>>): void;
  markBlockComplete(clientId: string, blockId: string, review: BlockReview): void;
  carryOverBlock(clientId: string, blockId: string, dayPhases: (CyclePhase | undefined)[]): void;
}

const NutritionContext = createContext<NutritionContextType | null>(null);

export function NutritionProvider({ children }: { children: ReactNode }) {
  const { appState } = useAppState();
  const [foods, setFoods] = useState<Food[]>(() => foodsForSeed(appState.foodSeed));
  const [recipes, setRecipes] = useState<Recipe[]>(() => recipesForSeed(appState.foodSeed));

  useEffect(() => {
    setFoods(foodsForSeed(appState.foodSeed));
    setRecipes(recipesForSeed(appState.foodSeed));
  }, [appState.foodSeed]);
  const [tags] = useState<Tag[]>(MOCK_TAGS);
  const [equivalenceGroups, setEquivalenceGroups] = useState<EquivalenceGroup[]>(MOCK_EQUIVALENCE_GROUPS);
  const [plans, setPlans] = useState<ClientNutritionPlan[]>(MOCK_PLANS);
  const [preferences, setPreferencesState] = useState<ClientFoodPreferences[]>(MOCK_PREFERENCES);

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
      slots: day.slots.map((s) => {
        if (s.id !== slotId) return s;
        // Only preserve ingredientSwaps when re-selecting the exact same recipe
        const sameRecipe = recipeId !== undefined && recipeId === s.recipeId;
        return {
          ...s,
          recipeId,
          portionScale: recipeId ? s.portionScale : 1,
          ingredientSwaps: sameRecipe ? s.ingredientSwaps : undefined,
        };
      }),
    }));

  const setSlotPortion = (clientId: string, blockId: string, date: string, slotId: string, portionScale: number) =>
    updateBlockDay(clientId, blockId, date, (day) => ({
      ...day,
      slots: day.slots.map((s) => s.id === slotId ? { ...s, portionScale } : s),
    }));

  // Commit a drafted day: replace its slots wholesale. Functional update so it
  // composes correctly if another block write is queued right after (e.g. apply-to-phase).
  const saveDay = (clientId: string, blockId: string, date: string, slots: MealSlot[]) =>
    updateBlockDay(clientId, blockId, date, (day) => ({ ...day, slots }));

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

  const setSlotIngredientSwap = (clientId: string, blockId: string, date: string, slotId: string, fromFoodId: string, toFoodId: string) =>
    updateBlockDay(clientId, blockId, date, (day) => ({ ...day, slots: day.slots.map((s) =>
      s.id !== slotId ? s : { ...s, ingredientSwaps: { ...(s.ingredientSwaps ?? {}), [fromFoodId]: toFoodId } }) }));

  const clearSlotIngredientSwap = (clientId: string, blockId: string, date: string, slotId: string, fromFoodId: string) =>
    updateBlockDay(clientId, blockId, date, (day) => ({ ...day, slots: day.slots.map((s) => {
      if (s.id !== slotId || !s.ingredientSwaps) return s;
      const next = { ...s.ingredientSwaps }; delete next[fromFoodId];
      return { ...s, ingredientSwaps: next };
    }) }));

  const addSlotAlternative = (clientId: string, blockId: string, date: string, slotId: string, recipeId: string) =>
    updateBlockDay(clientId, blockId, date, (day) => ({ ...day, slots: day.slots.map((s) =>
      s.id !== slotId || s.alternativeRecipeIds.includes(recipeId) ? s : { ...s, alternativeRecipeIds: [...s.alternativeRecipeIds, recipeId] }) }));

  const removeSlotAlternative = (clientId: string, blockId: string, date: string, slotId: string, recipeId: string) =>
    updateBlockDay(clientId, blockId, date, (day) => ({ ...day, slots: day.slots.map((s) =>
      s.id !== slotId ? s : { ...s, alternativeRecipeIds: s.alternativeRecipeIds.filter((r) => r !== recipeId) }) }));

  // Client meal-swap: sets clientSelectedRecipeId to the chosen alternative.
  // If the client picks the coach's primary recipe back, reverts clientSelectedRecipeId to undefined (clean default).
  const setSlotSelection = (clientId: string, blockId: string, date: string, slotId: string, recipeId: string) =>
    updateBlockDay(clientId, blockId, date, (day) => ({ ...day, slots: day.slots.map((s) => {
      if (s.id !== slotId) return s;
      return { ...s, clientSelectedRecipeId: recipeId === s.recipeId ? undefined : recipeId };
    }) }));

  const setPreferences = (clientId: string, patch: Partial<Omit<ClientFoodPreferences, 'clientId'>>) => {
    const cid = resolveClientId(clientId);
    setPreferencesState((prev) => {
      const existing = prev.find((p) => p.clientId === cid);
      if (existing) return prev.map((p) => p.clientId === cid ? { ...p, ...patch } : p);
      return [...prev, { clientId: cid, dietaryFlags: [], allergens: [], dislikedFoodIds: [], ...patch }];
    });
  };

  const markBlockComplete = (clientId: string, blockId: string, review: BlockReview) => {
    const cid = resolveClientId(clientId);
    setPlans((prev) => prev.map((plan) => plan.clientId !== cid ? plan : { ...plan,
      blocks: plan.blocks.map((b) => b.id !== blockId ? b : { ...b, status: 'past' as const, review }) }));
  };

  const carryOverBlock = (clientId: string, blockId: string, dayPhases: (CyclePhase | undefined)[]) => {
    const cid = resolveClientId(clientId);
    setPlans((prev) => prev.map((plan) => {
      if (plan.clientId !== cid) return plan;
      const src = plan.blocks.find((b) => b.id === blockId);
      if (!src) return plan;
      const start = isoToday();
      const days: PlanDay[] = src.days.map((d, i) => ({
        date: isoAddDays(start, i), phase: dayPhases[i],
        slots: d.slots.map((s) => ({ ...s, id: `slot-${++slotSeq}`, ingredientSwaps: s.ingredientSwaps ? { ...s.ingredientSwaps } : undefined, alternativeRecipeIds: [...s.alternativeRecipeIds] })),
      }));
      const carried: PlanBlock = { id: `block-${crypto.randomUUID()}`, startDate: start, days, status: 'active' };
      return { ...plan, blocks: [...plan.blocks.map((b) => ({ ...b, status: 'past' as const })), carried] };
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

  const archiveRecipe = (id: string) => {
    setRecipes((prev) => prev.map((r) => (r.id === id ? archivedItem(r, new Date()) : r)));
  };

  const restoreRecipe = (id: string): Recipe => {
    const restored = restoredItemIn(recipes, id);
    setRecipes((prev) => prev.map((r) => (r.id === id ? restored : r)));
    return restored;
  };

  const getRecipeUsage = (id: string): LibraryUsage => recipeUsage(id, plans);

  const deleteRecipe = (id: string): LibraryDeletion => {
    if (!isDeletable(getRecipeUsage(id))) return 'in-use';
    setRecipes((prev) => prev.filter((r) => r.id !== id));
    return 'deleted';
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

  const archiveFood = (id: string) => {
    setFoods((prev) => prev.map((f) => (f.id === id ? archivedItem(f, new Date()) : f)));
  };

  const restoreFood = (id: string): Food => {
    const restored = restoredItemIn(foods, id);
    setFoods((prev) => prev.map((f) => (f.id === id ? restored : f)));
    return restored;
  };

  const getFoodUsage = (id: string): LibraryUsage => foodUsage(id, recipes);

  const deleteFood = (id: string): LibraryDeletion => {
    if (!isDeletable(getFoodUsage(id))) return 'in-use';
    setFoods((prev) => prev.filter((f) => f.id !== id));
    return 'deleted';
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
        getFood, addFood, updateFood, archiveFood, restoreFood, deleteFood, getFoodUsage,
        addFoodTag, removeFoodTag,
        addEquivalenceGroup, assignFoodToGroup,
        recipes, getRecipe, addRecipe, updateRecipe, archiveRecipe, restoreRecipe, deleteRecipe, getRecipeUsage,
        getPlan, getPreferences, createBlock, setSlotRecipe, setSlotPortion, saveDay, copyDayToPhase, setPhaseTargetOverride,
        setSlotIngredientSwap, clearSlotIngredientSwap, addSlotAlternative, removeSlotAlternative, setSlotSelection,
        setPreferences, markBlockComplete, carryOverBlock,
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
