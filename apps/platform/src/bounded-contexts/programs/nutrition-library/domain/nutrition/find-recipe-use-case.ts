import type { FoodLibraryPort } from "./food-library-port";
import type { NutritionTag, NutritionTagsPort } from "./nutrition-tags-port";
import type { PickableFoods } from "./pickable-foods";
import type { Recipe } from "./recipe";
import type { RecipeLibraryPort, RecipeReference } from "./recipe-library-port";

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
  recipes: Pick<RecipeLibraryPort, "list">;
  foods: Pick<FoodLibraryPort, "list" | "referenced">;
  tags: Pick<NutritionTagsPort, "list">;
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
