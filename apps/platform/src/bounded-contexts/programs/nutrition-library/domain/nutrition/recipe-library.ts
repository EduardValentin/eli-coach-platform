import type { Recipe } from "./recipe";

export type RecipeAddition = "added" | "name-taken";

export type RecipeReplacement = "replaced" | "name-taken";

export type RecipeReference = {
  ownerAccountId: string;
  recipeId: string;
};

export interface RecipeLibrary {
  list(ownerAccountId: string): Promise<Recipe[]>;
  find(reference: RecipeReference): Promise<Recipe | null>;
  add(recipe: Recipe): Promise<RecipeAddition>;
  replace(recipe: Recipe): Promise<RecipeReplacement>;
}
