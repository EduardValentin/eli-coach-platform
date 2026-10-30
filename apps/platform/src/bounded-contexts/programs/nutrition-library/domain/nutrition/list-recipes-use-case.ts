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
  recipes: Pick<RecipeLibraryPort, "list">;
  foods: Pick<FoodLibraryPort, "list" | "referenced">;
  tags: Pick<NutritionTagsPort, "list">;
};

export class ListRecipesUseCase {
  constructor(private readonly options: ListRecipesUseCaseOptions) {}

  async execute(ownerAccountId: string): Promise<ListRecipesResult> {
    const { recipes, foods, tags } = this.options;
    const [storedRecipes, activeFoods, vocabulary] = await Promise.all([
      recipes.list(ownerAccountId),
      foods.list(ownerAccountId),
      tags.list(),
    ]);
    const archivedFoodIds = [
      ...new Set(storedRecipes.flatMap((recipe) => recipe.ingredientFoodIds)),
    ].filter((foodId) => !activeFoods.some(({ id }) => id === foodId));
    const archivedFoods =
      archivedFoodIds.length === 0
        ? []
        : await foods.referenced({ ownerAccountId, foodIds: archivedFoodIds });

    return {
      status: "listed",
      recipes: storedRecipes,
      foods: [...activeFoods, ...archivedFoods],
      tags: vocabulary,
    };
  }
}
