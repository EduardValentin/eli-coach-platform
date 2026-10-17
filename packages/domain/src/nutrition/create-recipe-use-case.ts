import type { Clock } from "../shared";
import type { FoodLibrary } from "./food-library";
import type { NutritionLibraryIncidents } from "./nutrition-library-incidents";
import type { NutritionTags } from "./nutrition-tags";
import { Recipe } from "./recipe";
import {
  RecipeDraft,
  type RecipeDraftInput,
  type RecipeDraftProblems,
} from "./recipe-draft";
import type { RecipeIds } from "./recipe-ids";
import type { RecipeLibrary } from "./recipe-library";

type CreateRecipeCommand = {
  ownerAccountId: string;
  draft: RecipeDraftInput;
};

export type CreateRecipeResult =
  | { status: "created"; recipe: Recipe }
  | { status: "invalid"; problems: RecipeDraftProblems }
  | { status: "failed" };

type CreateRecipeUseCaseOptions = {
  recipes: Pick<RecipeLibrary, "list" | "add">;
  foods: Pick<FoodLibrary, "list">;
  tags: Pick<NutritionTags, "list">;
  ids: RecipeIds;
  clock: Clock;
  incidents: Pick<NutritionLibraryIncidents, "recipeCreationFailed">;
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
  }: CreateRecipeCommand): Promise<CreateRecipeResult> {
    const { recipes, foods, tags, ids, clock } = this.options;
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

    if (draft.status === "invalid") return draft;

    const recipe = Recipe.added({
      id: ids.generate(),
      ownerAccountId,
      draft: draft.draft,
      at: clock.now(),
    });

    if ((await recipes.add(recipe)) === "name-taken") {
      return { status: "invalid", problems: { name: "taken" } };
    }

    return { status: "created", recipe };
  }
}
