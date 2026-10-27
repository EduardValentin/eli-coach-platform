import type { FoodLibrary } from "./food-library";
import type { NutritionTag, NutritionTags } from "./nutrition-tags";
import type { PickableFoods } from "./pickable-foods";
import type { Recipe } from "./recipe";
import type { RecipeLibrary, RecipeReference } from "./recipe-library";

export type FindRecipeResult =
  | {
      status: "found";
      recipe: Recipe;
      pickableFoods: PickableFoods;
      otherNames: string[];
      tags: NutritionTag[];
    }
  | { status: "not-found" };

type FindRecipeUseCaseOptions = {
  recipes: Pick<RecipeLibrary, "list">;
  foods: Pick<FoodLibrary, "list" | "referenced">;
  tags: Pick<NutritionTags, "list">;
};

export class FindRecipeUseCase {
  constructor(private readonly options: FindRecipeUseCaseOptions) {}

  async execute(reference: RecipeReference): Promise<FindRecipeResult> {
    const { recipes, foods, tags } = this.options;
    const { ownerAccountId, recipeId } = reference;
    const [storedRecipes, activeFoods, vocabulary] = await Promise.all([
      recipes.list(ownerAccountId),
      foods.list(ownerAccountId),
      tags.list(),
    ]);
    const recipe = storedRecipes.find(({ id }) => id === recipeId);

    if (!recipe) return { status: "not-found" };

    const referencedFoods = await foods.referenced({
      ownerAccountId,
      foodIds: recipe.ingredientFoodIds,
    });

    return {
      status: "found",
      recipe,
      pickableFoods: recipe.pickableFoods({ activeFoods, referencedFoods }),
      otherNames: storedRecipes
        .filter(({ id }) => id !== recipeId)
        .map(({ name }) => name),
      tags: vocabulary,
    };
  }
}
