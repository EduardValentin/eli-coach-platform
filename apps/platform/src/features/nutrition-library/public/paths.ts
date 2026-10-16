import { COACH_PORTAL_PATH } from "../../accounts/public/paths";

const FOODS_API = "/api/coach/foods";

const FOODS_SEGMENT = "foods";

export const NUTRITION_LIBRARY_API_PATHS = {
  foods: FOODS_API,
  food: `${FOODS_API}/:foodId`,
} as const;

export const COACH_NUTRITION_ROUTE_SEGMENT = "nutrition";

export const NEW_FOOD_ROUTE_SEGMENT = `${COACH_NUTRITION_ROUTE_SEGMENT}/${FOODS_SEGMENT}/new`;

export const FOOD_EDITOR_ROUTE_SEGMENT = `${COACH_NUTRITION_ROUTE_SEGMENT}/${FOODS_SEGMENT}/:foodId`;

export const COACH_NUTRITION_PATH = `${COACH_PORTAL_PATH}/${COACH_NUTRITION_ROUTE_SEGMENT}`;

export const NEW_FOOD_PATH = `${COACH_NUTRITION_PATH}/${FOODS_SEGMENT}/new`;

export function foodEditorPath(foodId: string): string {
  return `${COACH_NUTRITION_PATH}/${FOODS_SEGMENT}/${encodeURIComponent(foodId)}`;
}

export function foodPath(foodId: string): string {
  return `${FOODS_API}/${encodeURIComponent(foodId)}`;
}
