import type { Food, FoodCategory, FoodIcon } from '../context/NutritionContext';

export const MAX_FOOD_NAME_LENGTH = 80;
export const MAX_MACRO_PER_100G = 9_999.99;
export const MAX_PORTION_GRAMS = 99_999;
export const DEFAULT_PORTION_GRAMS = 100;

const MACROS = ['kcal', 'protein', 'carb', 'fat'] as const;

export type FoodDraft = {
  name: string;
  category: FoodCategory;
  icon: FoodIcon;
  kcal: string;
  protein: string;
  carb: string;
  fat: string;
  defaultPortionGrams: string;
  tagIds: readonly string[];
};

export type FoodDraftProblems = {
  name?: string;
  kcal?: string;
  protein?: string;
  carb?: string;
  fat?: string;
  defaultPortionGrams?: string;
};

export type FoodFields = Pick<
  Food,
  'name' | 'category' | 'icon' | 'kcal' | 'protein' | 'carb' | 'fat' | 'defaultPortionGrams' | 'tagIds'
>;

type NamedFood = { name: string; archivedAt?: string };

const normalisedName = (name: string) => name.trim().toLowerCase();

const numberOrZero = (value: string) => (value.trim() === '' ? 0 : Number(value));

const portionGrams = (value: string) => numberOrZero(value) || DEFAULT_PORTION_GRAMS;

const hasAtMostTwoDecimals = (value: number) => Math.round(value * 100) / 100 === value;

function nameProblem(name: string, otherFoods: readonly NamedFood[]): string | undefined {
  if (name.trim() === '') return 'Give the food a name';
  if (name.trim().length > MAX_FOOD_NAME_LENGTH) return `Keep the name to ${MAX_FOOD_NAME_LENGTH} characters`;
  const taken = otherFoods.some(
    (other) => !other.archivedAt && normalisedName(other.name) === normalisedName(name),
  );
  return taken ? 'A food with this name already exists' : undefined;
}

function macroProblem(value: string): string | undefined {
  const amount = numberOrZero(value);
  const fits = Number.isFinite(amount) && amount >= 0 && amount <= MAX_MACRO_PER_100G && hasAtMostTwoDecimals(amount);
  return fits ? undefined : 'Enter a value from 0 to 9,999.99';
}

function portionProblem(value: string): string | undefined {
  const grams = portionGrams(value);
  const fits = Number.isInteger(grams) && grams >= 1 && grams <= MAX_PORTION_GRAMS;
  return fits ? undefined : 'Enter whole grams up to 99,999';
}

export function draftProblems(draft: FoodDraft, otherFoods: readonly NamedFood[]): FoodDraftProblems {
  const problems: FoodDraftProblems = {};
  const name = nameProblem(draft.name, otherFoods);
  if (name) problems.name = name;
  for (const macro of MACROS) {
    const problem = macroProblem(draft[macro]);
    if (problem) problems[macro] = problem;
  }
  const portion = portionProblem(draft.defaultPortionGrams);
  if (portion) problems.defaultPortionGrams = portion;
  return problems;
}

export function isValidDraft(problems: FoodDraftProblems): boolean {
  return Object.keys(problems).length === 0;
}

export function foodFrom(draft: FoodDraft): FoodFields {
  return {
    name: draft.name.trim(),
    category: draft.category,
    icon: draft.icon,
    kcal: numberOrZero(draft.kcal),
    protein: numberOrZero(draft.protein),
    carb: numberOrZero(draft.carb),
    fat: numberOrZero(draft.fat),
    defaultPortionGrams: portionGrams(draft.defaultPortionGrams),
    tagIds: [...draft.tagIds],
  };
}
