import type { Clock } from "../shared";
import type { FoodLibrary } from "./food-library";
import type { NutritionLibraryIncidents } from "./nutrition-library-incidents";
import type { NutritionTags } from "./nutrition-tags";
import type { Recipe } from "./recipe";
import {
  RecipeDraft,
  type RecipeDraftInput,
  type RecipeDraftProblems,
} from "./recipe-draft";
import type { RecipeLibrary, RecipeReference } from "./recipe-library";

type EditRecipeCommand = RecipeReference & {
  draft: RecipeDraftInput;
};

export type EditRecipeResult =
  | { status: "edited"; recipe: Recipe }
  | { status: "invalid"; problems: RecipeDraftProblems }
  | { status: "not-found" }
  | { status: "failed" };

type EditRecipeUseCaseOptions = {
  recipes: Pick<RecipeLibrary, "find" | "list" | "replace">;
  foods: Pick<FoodLibrary, "list" | "referenced">;
  tags: Pick<NutritionTags, "list">;
  clock: Clock;
  incidents: Pick<NutritionLibraryIncidents, "recipeEditFailed">;
};

export class EditRecipeUseCase {
  constructor(private readonly options: EditRecipeUseCaseOptions) {}

  async execute(command: EditRecipeCommand): Promise<EditRecipeResult> {
    try {
      return await this.edit(command);
    } catch (error) {
      this.options.incidents.recipeEditFailed({
        recipeId: command.recipeId,
        error,
      });

      return { status: "failed" };
    }
  }

  private async edit({
    ownerAccountId,
    recipeId,
    draft: input,
  }: EditRecipeCommand): Promise<EditRecipeResult> {
    const { recipes, foods, tags, clock } = this.options;
    const [recipe, storedRecipes, activeFoods, vocabulary] = await Promise.all([
      recipes.find({ ownerAccountId, recipeId }),
      recipes.list(ownerAccountId),
      foods.list(ownerAccountId),
      tags.list(),
    ]);

    if (!recipe) return { status: "not-found" };

    const referencedFoods = await foods.referenced({
      ownerAccountId,
      foodIds: recipe.ingredientFoodIds,
    });
    const draft = RecipeDraft.from(input, {
      otherNames: storedRecipes
        .filter(({ id }) => id !== recipeId)
        .map(({ name }) => name),
      tags: vocabulary,
      pickableFoodIds: recipe.pickableFoods({ activeFoods, referencedFoods })
        .ids,
    });

    if (draft.status === "invalid") return draft;

    const edited = recipe.revised(draft.draft, clock.now());

    if ((await recipes.replace(edited)) === "name-taken") {
      return { status: "invalid", problems: { name: "taken" } };
    }

    return { status: "edited", recipe: edited };
  }
}
