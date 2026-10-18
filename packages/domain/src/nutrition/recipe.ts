import type { Food } from "./food";
import { PickableFoods } from "./pickable-foods";
import type { RecipeDraft, RecipeDraftSnapshot } from "./recipe-draft";
import {
  RecipePhoto,
  type RecipePhotoChange,
  type RecipePhotoSnapshot,
} from "./recipe-photo";

export type RecipeSnapshot = RecipeDraftSnapshot & {
  id: string;
  ownerAccountId: string;
  photo: RecipePhotoSnapshot | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type AddedRecipeInput = {
  id: string;
  ownerAccountId: string;
  draft: RecipeDraft;
  photo: RecipePhotoChange;
  at: Date;
};

type RecipeRevisionInput = {
  draft: RecipeDraft;
  photo: RecipePhotoChange;
  at: Date;
};

export type RecipeRevision = {
  recipe: Recipe;
  replacedPhoto: RecipePhoto | null;
};

type StoredRecipeFoods = {
  activeFoods: readonly Food[];
  referencedFoods: readonly Food[];
};

type RecipeFields = Omit<RecipeSnapshot, "photo">;

export class Recipe {
  private constructor(
    private readonly fields: RecipeFields,
    private readonly attachedPhoto: RecipePhoto | null,
  ) {}

  static added(input: AddedRecipeInput): Recipe {
    return new Recipe(
      {
        id: input.id,
        ownerAccountId: input.ownerAccountId,
        ...input.draft.toSnapshot(),
        archivedAt: null,
        createdAt: input.at,
        updatedAt: input.at,
      },
      input.photo.kind === "attach" ? input.photo.photo : null,
    );
  }

  static reconstitute(snapshot: RecipeSnapshot): Recipe {
    const { photo, ...fields } = snapshot;

    return new Recipe(
      {
        ...fields,
        ingredients: fields.ingredients.map((ingredient) => ({
          ...ingredient,
        })),
        mealRoleIds: [...fields.mealRoleIds],
        tagIds: [...fields.tagIds],
      },
      photo && RecipePhoto.fromStored(photo),
    );
  }

  static pickableFoodsForNew(activeFoods: readonly Food[]): PickableFoods {
    return PickableFoods.of({ offered: [...activeFoods], placedOnly: [] });
  }

  get id(): string {
    return this.fields.id;
  }

  get name(): string {
    return this.fields.name;
  }

  get photo(): RecipePhoto | null {
    return this.attachedPhoto;
  }

  get ingredientFoodIds(): string[] {
    return [...new Set(this.fields.ingredients.map(({ foodId }) => foodId))];
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

  revised(input: RecipeRevisionInput): RecipeRevision {
    return {
      recipe: new Recipe(
        { ...this.fields, ...input.draft.toSnapshot(), updatedAt: input.at },
        this.photoAfter(input.photo),
      ),
      replacedPhoto: input.photo.kind === "keep" ? null : this.attachedPhoto,
    };
  }

  toSnapshot(): RecipeSnapshot {
    return {
      ...this.fields,
      ingredients: this.fields.ingredients.map((ingredient) => ({
        ...ingredient,
      })),
      mealRoleIds: [...this.fields.mealRoleIds],
      tagIds: [...this.fields.tagIds],
      photo: this.attachedPhoto?.toSnapshot() ?? null,
    };
  }

  private photoAfter(change: RecipePhotoChange): RecipePhoto | null {
    switch (change.kind) {
      case "keep":
        return this.attachedPhoto;
      case "remove":
        return null;
      case "attach":
        return change.photo;
    }
  }
}
