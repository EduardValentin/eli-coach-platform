import { FOOD_CATEGORIES, type Food, type FoodCategory } from '../context/NutritionContext';
import type { SortChoice } from '../components/SortControl';
import { countsFor, matchesQuery, orderBy, type SortRule } from './libraryListing';

export type FoodSelection = {
  categories: readonly FoodCategory[];
  query: string;
};

export type FoodSortKey = 'name' | 'kcal' | 'protein' | 'carb' | 'fat';

export const FOOD_SORT: SortRule<FoodSortKey> = {
  fallback: 'name',
  defaultDirection: { name: 'asc', kcal: 'asc', protein: 'asc', carb: 'asc', fat: 'asc' },
};

function matchesCategories(food: Food, categories: readonly FoodCategory[]): boolean {
  return categories.length === 0 || categories.includes(food.category);
}

export function matchesFoodFilters(food: Food, selection: FoodSelection): boolean {
  return matchesQuery([food.name], selection.query) && matchesCategories(food, selection.categories);
}

export function hasActiveFoodFilters(selection: FoodSelection): boolean {
  return selection.categories.length > 0 || selection.query.trim().length > 0;
}

export function countsByCategory(
  foods: readonly Food[],
  selection: FoodSelection,
): Record<FoodCategory, number> {
  const others = foods.filter((food) => matchesFoodFilters(food, { ...selection, categories: [] }));
  return countsFor(FOOD_CATEGORIES, others, (food, category) => food.category === category);
}

export function sortFoods(foods: readonly Food[], sort: SortChoice<FoodSortKey>): Food[] {
  return orderBy(foods, sort, {
    name: (one, other) => one.name.localeCompare(other.name),
    kcal: (one, other) => one.kcal - other.kcal,
    protein: (one, other) => one.protein - other.protein,
    carb: (one, other) => one.carb - other.carb,
    fat: (one, other) => one.fat - other.fat,
  });
}
