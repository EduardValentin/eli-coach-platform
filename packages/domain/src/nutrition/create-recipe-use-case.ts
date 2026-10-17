import type { Clock } from "../shared";
import type { FoodLibrary } from "./food-library";
import type { NutritionLibraryIncidents } from "./nutrition-library-incidents";
import type { NutritionTags } from "./nutrition-tags";
import { Recipe } from "./recipe";
import {
  RecipeDraft,
  type RecipeDraftInput,
  type RecipeSaveProblems,
} from "./recipe-draft";
import type { RecipeIds } from "./recipe-ids";
import type { RecipeLibrary } from "./recipe-library";
import type { RecipePhotoChoice } from "./recipe-photo";
import type { RecipePhotoSaving } from "./recipe-photo-saving";

type CreateRecipeCommand = {
  ownerAccountId: string;
  draft: RecipeDraftInput;
  photo: RecipePhotoChoice;
};

export type CreateRecipeResult =
  | { status: "created"; recipe: Recipe }
  | { status: "invalid"; problems: RecipeSaveProblems }
  | { status: "failed" };

type CreateRecipeUseCaseOptions = {
  recipes: Pick<RecipeLibrary, "list" | "add">;
  foods: Pick<FoodLibrary, "list">;
  tags: Pick<NutritionTags, "list">;
  ids: RecipeIds;
  clock: Clock;
  incidents: Pick<NutritionLibraryIncidents, "recipeCreationFailed">;
  photos: Pick<
    RecipePhotoSaving,
    "judged" | "storeAccepted" | "writeOrRemoveStored" | "removeStored"
  >;
};

export class CreateRecipeUseCase {
  constructor(private readonly options: CreateRecipeUseCaseOptions) {}

  async execute(command: CreateRecipeCommand): Promise<CreateRecipeResult> {
    try {
      return await this.create(command);
    } catch (error) {
      this.options.incidents.recipeCreationFailed({ error });

      return { status: "failed" };
    }
  }

  private async create({
    ownerAccountId,
    draft: input,
    photo: choice,
  }: CreateRecipeCommand): Promise<CreateRecipeResult> {
    const { recipes, foods, tags, ids, clock, photos } = this.options;
    const [storedRecipes, activeFoods, vocabulary] = await Promise.all([
      recipes.list(ownerAccountId),
      foods.list(ownerAccountId),
      tags.list(),
    ]);
    const draft = RecipeDraft.from(input, {
      otherNames: storedRecipes.map(({ name }) => name),
      tags: vocabulary,
      pickableFoodIds: Recipe.pickableFoodsForNew(activeFoods).ids,
    });
    const photo = await photos.judged(choice);

    if (draft.status === "invalid" || photo.kind === "refused") {
      return {
        status: "invalid",
        problems: {
          ...(draft.status === "invalid" && draft.problems),
          ...(photo.kind === "refused" && { photo: photo.refusal }),
        },
      };
    }

    const change = await photos.storeAccepted(photo);
    const recipe = Recipe.added({
      id: ids.generate(),
      ownerAccountId,
      draft: draft.draft,
      photo: change,
      at: clock.now(),
    });

    if (
      (await photos.writeOrRemoveStored(change, () => recipes.add(recipe))) ===
      "name-taken"
    ) {
      return { status: "invalid", problems: { name: "taken" } };
    }

    return { status: "created", recipe };
  }
}
