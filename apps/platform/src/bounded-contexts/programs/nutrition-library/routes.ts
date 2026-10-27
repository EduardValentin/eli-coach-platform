import { relative } from "@react-router/dev/routes";

import {
  COACH_NUTRITION_ROUTE_SEGMENT,
  FOOD_EDITOR_ROUTE_SEGMENT,
  NEW_FOOD_ROUTE_SEGMENT,
  NUTRITION_LIBRARY_API_PATHS,
  RECIPE_BUILDER_ROUTE_SEGMENT,
  RECIPE_EDITOR_ROUTE_SEGMENT,
} from "./public/paths";

const { route } = relative(import.meta.dirname);

const FOOD_EDITOR_PAGE = "./ui/coach/foods/food-editor-page.tsx";

const RECIPE_BUILDER_PAGE = "./ui/coach/recipes/recipe-builder-page.tsx";

export const nutritionLibraryCoachRoutes = [
  route(
    COACH_NUTRITION_ROUTE_SEGMENT,
    "./ui/coach/nutrition/nutrition-page.tsx",
  ),
  route(NEW_FOOD_ROUTE_SEGMENT, FOOD_EDITOR_PAGE, {
    id: "bounded-contexts/programs/nutrition-library/new-food",
  }),
  route(FOOD_EDITOR_ROUTE_SEGMENT, FOOD_EDITOR_PAGE, {
    id: "bounded-contexts/programs/nutrition-library/edit-food",
  }),
];

export const nutritionLibraryCoachBuilderRoutes = [
  route(RECIPE_BUILDER_ROUTE_SEGMENT, RECIPE_BUILDER_PAGE, {
    id: "bounded-contexts/programs/nutrition-library/new-recipe",
  }),
  route(RECIPE_EDITOR_ROUTE_SEGMENT, RECIPE_BUILDER_PAGE, {
    id: "bounded-contexts/programs/nutrition-library/edit-recipe",
  }),
];

export const nutritionLibraryApiRoutes = [
  route(
    NUTRITION_LIBRARY_API_PATHS.foods.slice(1),
    "./adapters/inbound/http/foods/foods.ts",
  ),
  route(
    NUTRITION_LIBRARY_API_PATHS.food.slice(1),
    "./adapters/inbound/http/foods/food.ts",
  ),
  route(
    NUTRITION_LIBRARY_API_PATHS.recipes.slice(1),
    "./adapters/inbound/http/recipes/recipes.ts",
  ),
  route(
    NUTRITION_LIBRARY_API_PATHS.recipe.slice(1),
    "./adapters/inbound/http/recipes/recipe.ts",
  ),
  route(
    NUTRITION_LIBRARY_API_PATHS.recipePhoto.slice(1),
    "./adapters/inbound/http/recipes/recipe-photo.ts",
  ),
];
