import { relative } from "@react-router/dev/routes";

import {
  COACH_NUTRITION_ROUTE_SEGMENT,
  FOOD_EDITOR_ROUTE_SEGMENT,
  NEW_FOOD_ROUTE_SEGMENT,
  NUTRITION_LIBRARY_API_PATHS,
} from "./public/paths";

const { route } = relative(import.meta.dirname);

const FOOD_EDITOR_PAGE = "./ui/coach/foods/food-editor-page.tsx";

export const nutritionLibraryCoachRoutes = [
  route(
    COACH_NUTRITION_ROUTE_SEGMENT,
    "./ui/coach/foods/food-library-page.tsx",
  ),
  route(NEW_FOOD_ROUTE_SEGMENT, FOOD_EDITOR_PAGE, {
    id: "features/nutrition-library/new-food",
  }),
  route(FOOD_EDITOR_ROUTE_SEGMENT, FOOD_EDITOR_PAGE, {
    id: "features/nutrition-library/edit-food",
  }),
];

export const nutritionLibraryApiRoutes = [
  route(NUTRITION_LIBRARY_API_PATHS.foods.slice(1), "./api/foods/foods.ts"),
  route(NUTRITION_LIBRARY_API_PATHS.food.slice(1), "./api/foods/food.ts"),
  route(
    NUTRITION_LIBRARY_API_PATHS.recipes.slice(1),
    "./api/recipes/recipes.ts",
  ),
  route(NUTRITION_LIBRARY_API_PATHS.recipe.slice(1), "./api/recipes/recipe.ts"),
];
