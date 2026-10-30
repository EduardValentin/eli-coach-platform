import type { FoodLibraryPort } from "./food-library-port";
import type { NutritionTag, NutritionTagsPort } from "./nutrition-tags-port";
import type { PickableFoods } from "./pickable-foods";
import { Recipe } from "./recipe";
import type { RecipeLibraryPort } from "./recipe-library-port";

export type StartRecipeResult = {
  status: "started";
  pickableFoods: PickableFoods;
  otherNames: string[];
  tags: NutritionTag[];
};

type StartRecipeUseCaseOptions = {
  recipes: Pick<RecipeLibraryPort, "list">;
  foods: Pick<FoodLibraryPort, "list">;
  tags: Pick<NutritionTagsPort, "list">;
};

export class StartRecipeUseCase {
  constructor(private readonly options: StartRecipeUseCaseOptions) {}

  async execute(ownerAccountId: string): Promise<StartRecipeResult> {
    const { recipes, foods, tags } = this.options;
    const [storedRecipes, activeFoods, vocabulary] = await Promise.all([
      recipes.list(ownerAccountId),
      foods.list(ownerAccountId),
      tags.list(),
    ]);

    return {
      status: "started",
      pickableFoods: Recipe.pickableFoodsForNew(activeFoods),
      otherNames: storedRecipes.map(({ name }) => name),
      tags: vocabulary,
    };
  }
}
