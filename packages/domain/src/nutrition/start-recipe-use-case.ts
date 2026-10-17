import type { FoodLibrary } from "./food-library";
import type { NutritionTag, NutritionTags } from "./nutrition-tags";
import type { PickableFoods } from "./pickable-foods";
import { Recipe } from "./recipe";
import type { RecipeLibrary } from "./recipe-library";

export type StartRecipeResult = {
  status: "started";
  pickableFoods: PickableFoods;
  otherNames: string[];
  tags: NutritionTag[];
};

type StartRecipeUseCaseOptions = {
  recipes: Pick<RecipeLibrary, "list">;
  foods: Pick<FoodLibrary, "list">;
  tags: Pick<NutritionTags, "list">;
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
