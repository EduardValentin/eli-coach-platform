import type { Food } from "./food";
import { PickableFoods } from "./pickable-foods";
import type { RecipeDraft, RecipeDraftSnapshot } from "./recipe-draft";

export type RecipeSnapshot = RecipeDraftSnapshot & {
  id: string;
  ownerAccountId: string;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type AddedRecipeInput = {
  id: string;
  ownerAccountId: string;
  draft: RecipeDraft;
  at: Date;
};

type StoredRecipeFoods = {
  activeFoods: readonly Food[];
  referencedFoods: readonly Food[];
};

export class Recipe {
  private constructor(private readonly snapshot: RecipeSnapshot) {}

  static added(input: AddedRecipeInput): Recipe {
    return new Recipe({
      id: input.id,
      ownerAccountId: input.ownerAccountId,
      ...input.draft.toSnapshot(),
      archivedAt: null,
      createdAt: input.at,
      updatedAt: input.at,
    });
  }

  static reconstitute(snapshot: RecipeSnapshot): Recipe {
    return new Recipe({
      ...snapshot,
      ingredients: snapshot.ingredients.map((ingredient) => ({
        ...ingredient,
      })),
      mealRoleIds: [...snapshot.mealRoleIds],
      tagIds: [...snapshot.tagIds],
    });
  }

  static pickableFoodsForNew(activeFoods: readonly Food[]): PickableFoods {
    return PickableFoods.of({ offered: [...activeFoods], placedOnly: [] });
  }

  get id(): string {
    return this.snapshot.id;
  }

  get name(): string {
    return this.snapshot.name;
  }

  get ingredientFoodIds(): string[] {
    return [...new Set(this.snapshot.ingredients.map(({ foodId }) => foodId))];
  }

  pickableFoods({
    activeFoods,
    referencedFoods,
  }: StoredRecipeFoods): PickableFoods {
    const usedFoodIds = this.ingredientFoodIds;
    const placedOnly = referencedFoods.filter(
      ({ id }) =>
        usedFoodIds.includes(id) &&
        !activeFoods.some((active) => active.id === id),
    );

    return PickableFoods.of({ offered: [...activeFoods], placedOnly });
  }

  revised(draft: RecipeDraft, at: Date): Recipe {
    return new Recipe({
      ...this.snapshot,
      ...draft.toSnapshot(),
      updatedAt: at,
    });
  }

  toSnapshot(): RecipeSnapshot {
    return {
      ...this.snapshot,
      ingredients: this.snapshot.ingredients.map((ingredient) => ({
        ...ingredient,
      })),
      mealRoleIds: [...this.snapshot.mealRoleIds],
      tagIds: [...this.snapshot.tagIds],
    };
  }
}
