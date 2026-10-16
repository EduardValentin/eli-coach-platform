import { COACH_PORTAL_PATH } from "../../accounts/public/paths";

const FOODS_API = "/api/coach/foods";

const RECIPES_API = "/api/coach/recipes";

const FOODS_SEGMENT = "foods";

const RECIPE_BUILDER_SEGMENT = "recipe-builder";

export const NUTRITION_LIBRARY_API_PATHS = {
  foods: FOODS_API,
  food: `${FOODS_API}/:foodId`,
  recipes: RECIPES_API,
  recipe: `${RECIPES_API}/:recipeId`,
} as const;

export const COACH_NUTRITION_ROUTE_SEGMENT = "nutrition";

export const NEW_FOOD_ROUTE_SEGMENT = `${COACH_NUTRITION_ROUTE_SEGMENT}/${FOODS_SEGMENT}/new`;

export const FOOD_EDITOR_ROUTE_SEGMENT = `${COACH_NUTRITION_ROUTE_SEGMENT}/${FOODS_SEGMENT}/:foodId`;

export const RECIPE_BUILDER_ROUTE_SEGMENT = `${COACH_NUTRITION_ROUTE_SEGMENT}/${RECIPE_BUILDER_SEGMENT}`;

export const RECIPE_EDITOR_ROUTE_SEGMENT = `${RECIPE_BUILDER_ROUTE_SEGMENT}/:recipeId`;

export const COACH_NUTRITION_PATH = `${COACH_PORTAL_PATH}/${COACH_NUTRITION_ROUTE_SEGMENT}`;

export const NEW_FOOD_PATH = `${COACH_NUTRITION_PATH}/${FOODS_SEGMENT}/new`;

export const NEW_RECIPE_PATH = `${COACH_NUTRITION_PATH}/${RECIPE_BUILDER_SEGMENT}`;

export const NUTRITION_TAB_PARAM = "tab";

export const NUTRITION_TABS = ["foods", "recipes"] as const;

export type NutritionTab = (typeof NUTRITION_TABS)[number];

export const COACH_RECIPES_PATH = `${COACH_NUTRITION_PATH}?${NUTRITION_TAB_PARAM}=recipes`;

export function nutritionTabOf(searchParams: URLSearchParams): NutritionTab {
  const requested = searchParams.get(NUTRITION_TAB_PARAM);

  return NUTRITION_TABS.find((tab) => tab === requested) ?? "foods";
}

export function foodEditorPath(foodId: string): string {
  return `${COACH_NUTRITION_PATH}/${FOODS_SEGMENT}/${encodeURIComponent(foodId)}`;
}

export function foodPath(foodId: string): string {
  return `${FOODS_API}/${encodeURIComponent(foodId)}`;
}

export function recipeBuilderPath(recipeId: string): string {
  return `${NEW_RECIPE_PATH}/${encodeURIComponent(recipeId)}`;
}

export function recipePath(recipeId: string): string {
  return `${RECIPES_API}/${encodeURIComponent(recipeId)}`;
}
