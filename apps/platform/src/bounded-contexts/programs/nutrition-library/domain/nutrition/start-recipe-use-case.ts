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
  recipeLibraryPort: Pick<RecipeLibraryPort, "list">;
  foodLibraryPort: Pick<FoodLibraryPort, "list">;
  nutritionTagsPort: Pick<NutritionTagsPort, "list">;
};

export class StartRecipeUseCase {
  constructor(private readonly options: StartRecipeUseCaseOptions) {}

  async execute(ownerAccountId: string): Promise<StartRecipeResult> {
    const { recipeLibraryPort, foodLibraryPort, nutritionTagsPort } =
      this.options;
    const [storedRecipes, activeFoods, vocabulary] = await Promise.all([
      recipeLibraryPort.list(ownerAccountId),
      foodLibraryPort.list(ownerAccountId),
      nutritionTagsPort.list(),
    ]);

    return {
      status: "started",
      pickableFoods: Recipe.pickableFoodsForNew(activeFoods),
      otherNames: storedRecipes.map(({ name }) => name),
      tags: vocabulary,
    };
  }
}
