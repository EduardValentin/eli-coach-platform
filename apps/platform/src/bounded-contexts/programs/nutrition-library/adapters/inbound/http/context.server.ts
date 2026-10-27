import { createContext, type RouterContext } from "react-router";

import type { FoodLibraryController } from "~/bounded-contexts/programs/nutrition-library/adapters/inbound/http/coach/food-library-controller.server";
import type { RecipeLibraryController } from "~/bounded-contexts/programs/nutrition-library/adapters/inbound/http/coach/recipe-library-controller.server";

export type NutritionLibraryFeature = {
  foodLibrary: FoodLibraryController;
  recipeLibrary: RecipeLibraryController;
};

export const nutritionLibraryContext: RouterContext<NutritionLibraryFeature> =
  createContext<NutritionLibraryFeature>();
