import type { Clock } from "../shared";
import type { FoodLibrary } from "./food-library";
import type { NutritionLibraryIncidents } from "./nutrition-library-incidents";
import type { NutritionTags } from "./nutrition-tags";
import type { Recipe } from "./recipe";
import {
  RecipeDraft,
  type RecipeDraftInput,
  type RecipeSaveProblems,
} from "./recipe-draft";
import type { RecipeLibrary, RecipeReference } from "./recipe-library";
import type { RecipePhotoChoice } from "./recipe-photo";
import {
  type RecipePhotoSavingPort,
  saveProblemsOf,
} from "./recipe-photo-saving";

type EditRecipeCommand = RecipeReference & {
  draft: RecipeDraftInput;
  photo: RecipePhotoChoice;
};

export type EditRecipeResult =
  | { status: "edited"; recipe: Recipe }
  | { status: "invalid"; problems: RecipeSaveProblems }
  | { status: "not-found" }
  | { status: "failed" };

type EditRecipeUseCaseOptions = {
  recipes: Pick<RecipeLibrary, "find" | "list" | "replace">;
  foods: Pick<FoodLibrary, "list" | "referenced">;
  tags: Pick<NutritionTags, "list">;
  clock: Clock;
  incidents: Pick<NutritionLibraryIncidents, "recipeEditFailed">;
  photos: RecipePhotoSavingPort;
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
    photo: choice,
  }: EditRecipeCommand): Promise<EditRecipeResult> {
    const { recipes, foods, tags, clock, photos } = this.options;
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
    const photo = await photos.judged(choice);

    if (draft.status === "invalid" || photo.kind === "refused") {
      return {
        status: "invalid",
        problems: saveProblemsOf(draft, photo),
      };
    }

    const change = await photos.storeAccepted(photo);
    const revision = recipe.revised({
      draft: draft.draft,
      photo: change,
      at: clock.now(),
    });

    if (
      (await photos.writeOrRemoveStored(change, () =>
        recipes.replace(revision.recipe),
      )) === "name-taken"
    ) {
      return { status: "invalid", problems: { name: "taken" } };
    }

    await photos.removeStored(revision.replacedPhoto);

    return { status: "edited", recipe: revision.recipe };
  }
}
