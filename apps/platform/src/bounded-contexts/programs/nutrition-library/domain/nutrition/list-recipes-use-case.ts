import type { Food } from "./food";
import type { FoodLibrary } from "./food-library";
import type { NutritionTag, NutritionTags } from "./nutrition-tags";
import type { Recipe } from "./recipe";
import type { RecipeLibrary } from "./recipe-library";

export type ListRecipesResult = {
  status: "listed";
  recipes: Recipe[];
  foods: Food[];
  tags: NutritionTag[];
};

type ListRecipesUseCaseOptions = {
  recipes: Pick<RecipeLibrary, "list">;
  foods: Pick<FoodLibrary, "list" | "referenced">;
  tags: Pick<NutritionTags, "list">;
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
