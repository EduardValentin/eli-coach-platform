import type { Food } from "./food";
import type { FoodLibraryPort } from "./food-library-port";
import type { NutritionTag, NutritionTagsPort } from "./nutrition-tags-port";
import type { Recipe } from "./recipe";
import type { RecipeLibraryPort } from "./recipe-library-port";

export type ListRecipesResult = {
  status: "listed";
  recipes: Recipe[];
  foods: Food[];
  tags: NutritionTag[];
};

type ListRecipesUseCaseOptions = {
  recipeLibraryPort: Pick<RecipeLibraryPort, "list">;
  foodLibraryPort: Pick<FoodLibraryPort, "list" | "referenced">;
  nutritionTagsPort: Pick<NutritionTagsPort, "list">;
};

export class ListRecipesUseCase {
  constructor(private readonly options: ListRecipesUseCaseOptions) {}

  async execute(ownerAccountId: string): Promise<ListRecipesResult> {
    const { recipeLibraryPort, foodLibraryPort, nutritionTagsPort } =
      this.options;
    const [storedRecipes, activeFoods, vocabulary] = await Promise.all([
      recipeLibraryPort.list(ownerAccountId),
      foodLibraryPort.list(ownerAccountId),
      nutritionTagsPort.list(),
    ]);
    const archivedFoodIds = [
      ...new Set(storedRecipes.flatMap((recipe) => recipe.ingredientFoodIds)),
    ].filter((foodId) => !activeFoods.some(({ id }) => id === foodId));
    const archivedFoods =
      archivedFoodIds.length === 0
        ? []
        : await foodLibraryPort.referenced({
            ownerAccountId,
            foodIds: archivedFoodIds,
          });

    return {
      status: "listed",
      recipes: storedRecipes,
      foods: [...activeFoods, ...archivedFoods],
      tags: vocabulary,
    };
  }
}
