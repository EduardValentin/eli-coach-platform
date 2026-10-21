import { z } from "zod";

import { isProductionRuntime, type AppConfig } from "./app";

const PLACEHOLDER_SECRET = "replace-me";

export const recipePhotosShape = {
  RECIPE_PHOTO_ROOT: z.string().trim().min(1),
};

export type RecipePhotosConfig = z.infer<z.ZodObject<typeof recipePhotosShape>>;

export function refineRecipePhotos(
  environment: RecipePhotosConfig & AppConfig,
  context: z.RefinementCtx,
): void {
  if (
    !isProductionRuntime(environment) ||
    environment.RECIPE_PHOTO_ROOT !== PLACEHOLDER_SECRET
  ) {
    return;
  }

  context.addIssue({
    code: "custom",
    message:
      "Production recipe photos require a non-placeholder RECIPE_PHOTO_ROOT.",
    path: ["RECIPE_PHOTO_ROOT"],
  });
}
