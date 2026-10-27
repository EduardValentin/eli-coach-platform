import { createContext, type RouterContext } from "react-router";

import type { NutritionLibraryFeature } from "../nutrition-library-composition.server";

export const nutritionLibraryContext: RouterContext<NutritionLibraryFeature> =
  createContext<NutritionLibraryFeature>();
