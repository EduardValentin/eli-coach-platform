import type { ClockPort } from "../clock-port";
import type { FoodLibraryPort } from "./food-library-port";
import type { NutritionLibraryIncidentsPort } from "./nutrition-library-incidents-port";
import type { NutritionTagsPort } from "./nutrition-tags-port";
import type { Recipe } from "./recipe";
import {
  RecipeDraft,
  type RecipeDraftInput,
  type RecipeSaveProblems,
} from "./recipe-draft";
import type { RecipeLibraryPort, RecipeReference } from "./recipe-library-port";
import type { RecipePhotoChoice } from "./recipe-photo";
import { type RecipePhotoSaving, saveProblemsOf } from "./recipe-photo-saving";

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
  recipeLibraryPort: Pick<RecipeLibraryPort, "find" | "list" | "replace">;
  foodLibraryPort: Pick<FoodLibraryPort, "list" | "referenced">;
  nutritionTagsPort: Pick<NutritionTagsPort, "list">;
  clockPort: ClockPort;
  nutritionLibraryIncidentsPort: Pick<
    NutritionLibraryIncidentsPort,
    "recipeEditFailed"
  >;
  photos: RecipePhotoSaving;
};

export class EditRecipeUseCase {
  constructor(private readonly options: EditRecipeUseCaseOptions) {}

  async execute(command: EditRecipeCommand): Promise<EditRecipeResult> {
    try {
      return await this.edit(command);
    } catch (error) {
      this.options.nutritionLibraryIncidentsPort.recipeEditFailed({
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
    const {
      recipeLibraryPort,
      foodLibraryPort,
      nutritionTagsPort,
      clockPort,
      photos,
    } = this.options;
    const [recipe, storedRecipes, activeFoods, vocabulary] = await Promise.all([
      recipeLibraryPort.find({ ownerAccountId, recipeId }),
      recipeLibraryPort.list(ownerAccountId),
      foodLibraryPort.list(ownerAccountId),
      nutritionTagsPort.list(),
    ]);

    if (!recipe) return { status: "not-found" };

    const referencedFoods = await foodLibraryPort.referenced({
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
      at: clockPort.now(),
    });

    if (
      (await photos.writeOrRemoveStored(change, () =>
        recipeLibraryPort.replace(revision.recipe),
      )) === "name-taken"
    ) {
      return { status: "invalid", problems: { name: "taken" } };
    }

    await photos.removeStored(revision.replacedPhoto);

    return { status: "edited", recipe: revision.recipe };
  }
}
