import {
  recipeMacros,
  type Food,
  type Recipe,
  type Tag,
  type TagFamily,
} from '../context/NutritionContext';
import type { SortChoice, SortOption } from '../components/SortControl';
import { countsFor, matchesQuery, orderBy, type SortRule } from './libraryListing';

export type CalorieBand = 'any' | '200' | '500' | '600';

export const CALORIE_BAND_OPTIONS: readonly CalorieBand[] = ['any', '200', '500', '600'];

export const CALORIE_BAND_LABELS: Record<CalorieBand, string> = {
  any: 'Any calories',
  '200': 'Under 200 kcal',
  '500': 'Under 500 kcal',
  '600': 'Under 600 kcal',
};

export type RecipeTagFamily = Extract<TagFamily, 'meal-time' | 'cycle-phase' | 'dietary'>;

export const RECIPE_FILTER_FAMILIES: readonly RecipeTagFamily[] = [
  'meal-time',
  'cycle-phase',
  'dietary',
];

export type RecipeSelection = {
  tags: Readonly<Record<RecipeTagFamily, readonly string[]>>;
  calories: CalorieBand;
  query: string;
};

export type ListedRecipe = {
  recipe: Recipe;
  kcal: number;
  minutes: number;
  tagIds: readonly string[];
};

export type RecipeSortKey = 'name' | 'calories' | 'time';

export const RECIPE_SORT: SortRule<RecipeSortKey> = {
  fallback: 'name',
  defaultDirection: { name: 'asc', calories: 'asc', time: 'asc' },
};

export const RECIPE_SORT_OPTIONS: readonly SortOption<RecipeSortKey>[] = [
  {
    key: 'name',
    label: 'Name',
    order: 'alphabetical',
    defaultDirection: 'asc',
    directionLabels: { asc: 'A to Z', desc: 'Z to A' },
  },
  {
    key: 'calories',
    label: 'Calories',
    order: 'chronological',
    defaultDirection: 'asc',
    directionLabels: { asc: 'Lowest first', desc: 'Highest first' },
  },
  {
    key: 'time',
    label: 'Total time',
    order: 'chronological',
    defaultDirection: 'asc',
    directionLabels: { asc: 'Quickest first', desc: 'Longest first' },
  },
];

export function listRecipes(recipes: readonly Recipe[], foods: readonly Food[]): ListedRecipe[] {
  return recipes.map((recipe) => ({
    recipe,
    kcal: recipeMacros(recipe, [...foods]).kcal,
    minutes: recipe.prepMinutes + recipe.cookMinutes,
    tagIds: [...recipe.mealRoleIds, ...recipe.tagIds],
  }));
}

export function parseCalorieBand(raw: string | null): CalorieBand {
  return CALORIE_BAND_OPTIONS.find((band) => band === raw) ?? 'any';
}

function matchesCalories(listed: ListedRecipe, calories: CalorieBand): boolean {
  return calories === 'any' || listed.kcal <= Number(calories);
}

function matchesTags(listed: ListedRecipe, selection: RecipeSelection): boolean {
  return RECIPE_FILTER_FAMILIES.every((family) =>
    selection.tags[family].every((tagId) => listed.tagIds.includes(tagId)),
  );
}

export function matchesRecipeFilters(listed: ListedRecipe, selection: RecipeSelection): boolean {
  return (
    matchesQuery([listed.recipe.name], selection.query) &&
    matchesTags(listed, selection) &&
    matchesCalories(listed, selection.calories)
  );
}

export function hasActiveRecipeFilters(selection: RecipeSelection): boolean {
  return (
    RECIPE_FILTER_FAMILIES.some((family) => selection.tags[family].length > 0) ||
    selection.calories !== 'any' ||
    selection.query.trim().length > 0
  );
}

export function countsByTag(
  listed: readonly ListedRecipe[],
  selection: RecipeSelection,
  familyTags: { family: RecipeTagFamily; tags: readonly Tag[] },
): Record<string, number> {
  const others = listed.filter((item) =>
    matchesRecipeFilters(item, { ...selection, tags: { ...selection.tags, [familyTags.family]: [] } }),
  );
  return countsFor(
    familyTags.tags.map((tag) => tag.id),
    others,
    (item, tagId) => item.tagIds.includes(tagId),
  );
}

export function countsByCalorieBand(
  listed: readonly ListedRecipe[],
  selection: RecipeSelection,
): Record<CalorieBand, number> {
  const others = listed.filter((item) =>
    matchesRecipeFilters(item, { ...selection, calories: 'any' }),
  );
  return countsFor(CALORIE_BAND_OPTIONS, others, matchesCalories);
}

export function sortRecipes(
  listed: readonly ListedRecipe[],
  sort: SortChoice<RecipeSortKey>,
): ListedRecipe[] {
  return orderBy(listed, sort, {
    name: (one, other) => one.recipe.name.localeCompare(other.recipe.name),
    calories: (one, other) => one.kcal - other.kcal,
    time: (one, other) => one.minutes - other.minutes,
  });
}
