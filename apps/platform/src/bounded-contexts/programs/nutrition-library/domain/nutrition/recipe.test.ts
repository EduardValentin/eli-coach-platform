import { describe, expect, it } from "vitest";

import { Recipe } from "./recipe";
import { RecipeDraft, type RecipeDraftInput } from "./recipe-draft";
import { RecipePhoto, type RecipePhotoChange } from "./recipe-photo";

const ADDED_AT = new Date("2026-10-14T09:00:00.000Z");
const REVISED_AT = new Date("2026-10-15T09:00:00.000Z");
const COACH_ACCOUNT_ID = "coach-account-1";
const PHOTO_ID = "7a1b0000-0000-4000-8000-000000000001";
const NEW_PHOTO_ID = "7a1b0000-0000-4000-8000-000000000002";
const KEEP: RecipePhotoChange = { kind: "keep" };

const PORRIDGE: RecipeDraftInput = {
  name: "Porridge",
  ingredients: [
    { foodId: "food-oats", grams: 40, method: "boiled" },
    { foodId: "food-milk", grams: 250, method: "raw" },
    { foodId: "food-oats", grams: 10, method: "raw" },
  ],
  prepMinutes: 5,
  cookMinutes: 10,
  instructions: "Simmer the oats in the milk.",
  icon: "pot",
  tagIds: ["mt-breakfast", "di-vegetarian"],
};

function validDraft(input: RecipeDraftInput): RecipeDraft {
  const result = RecipeDraft.from(input, {
    otherNames: [],
    tags: [
      { id: "mt-breakfast", family: "meal-time" },
      { id: "di-vegetarian", family: "dietary" },
    ],
    pickableFoodIds: ["food-oats", "food-milk", "food-honey"],
  });

  if (result.status !== "valid") {
    throw new Error("The draft is meant to be valid.");
  }

  return result.draft;
}

function attaching(photoId: string): RecipePhotoChange {
  return { kind: "attach", photo: RecipePhoto.fromStored({ photoId }) };
}

function addedPorridge(photo: RecipePhotoChange = KEEP): Recipe {
  return Recipe.added({
    id: "recipe-1",
    ownerAccountId: COACH_ACCOUNT_ID,
    draft: validDraft(PORRIDGE),
    photo,
    at: ADDED_AT,
  });
}

describe("Recipe", () => {
  it("is added with its draft, owned by the coach who added it, active, created and updated at the same moment", () => {
    // arrange
    const draft = validDraft(PORRIDGE);

    // act
    const recipe = Recipe.added({
      id: "recipe-1",
      ownerAccountId: COACH_ACCOUNT_ID,
      draft,
      photo: KEEP,
      at: ADDED_AT,
    });

    // assert
    expect(recipe.toSnapshot()).toEqual({
      id: "recipe-1",
      ownerAccountId: COACH_ACCOUNT_ID,
      ...draft.toSnapshot(),
      photo: null,
      archivedAt: null,
      createdAt: ADDED_AT,
      updatedAt: ADDED_AT,
    });
  });

  it("is revised as a whole, keeping its id, its owner, its state and the moment it was created", () => {
    // arrange
    const recipe = addedPorridge();
    const draft = validDraft({
      ...PORRIDGE,
      name: "Honey porridge",
      ingredients: [{ foodId: "food-honey", grams: 15, method: "raw" }],
      icon: null,
      tagIds: [],
    });

    // act
    const { recipe: revised } = recipe.revised({
      draft,
      photo: KEEP,
      at: REVISED_AT,
    });

    // assert
    expect(revised.toSnapshot()).toEqual({
      id: "recipe-1",
      ownerAccountId: COACH_ACCOUNT_ID,
      ...draft.toSnapshot(),
      photo: null,
      archivedAt: null,
      createdAt: ADDED_AT,
      updatedAt: REVISED_AT,
    });
    expect(recipe.toSnapshot().name).toBe("Porridge");
  });

  it("answers its id, its name and each food it uses once, in the order placed", () => {
    // arrange
    const recipe = addedPorridge();

    // act
    const identity = {
      id: recipe.id,
      name: recipe.name,
      ingredientFoodIds: recipe.ingredientFoodIds,
    };

    // assert
    expect(identity).toEqual({
      id: "recipe-1",
      name: "Porridge",
      ingredientFoodIds: ["food-oats", "food-milk"],
    });
  });

  it("hands out copies of its ingredients and tags, so a changed snapshot leaves it as it was", () => {
    // arrange
    const recipe = Recipe.reconstitute(addedPorridge().toSnapshot());
    const snapshot = recipe.toSnapshot();

    // act
    snapshot.ingredients[0]!.grams = 999;
    snapshot.ingredients.pop();
    snapshot.mealRoleIds.push("mt-lunch");
    snapshot.tagIds.length = 0;

    // assert
    expect(recipe.toSnapshot()).toMatchObject({
      ingredients: [
        { foodId: "food-oats", grams: 40, method: "boiled" },
        { foodId: "food-milk", grams: 250, method: "raw" },
        { foodId: "food-oats", grams: 10, method: "raw" },
      ],
      mealRoleIds: ["mt-breakfast"],
      tagIds: ["di-vegetarian"],
    });
  });

  it("is added with the photo she attached", () => {
    // arrange
    const photo = attaching(PHOTO_ID);

    // act
    const recipe = addedPorridge(photo);

    // assert
    expect(recipe.photo?.photoId).toBe(PHOTO_ID);
    expect(recipe.toSnapshot().photo).toEqual({ photoId: PHOTO_ID });
  });

  it("is added without a photo when she attached none", () => {
    // arrange
    const choices: RecipePhotoChange[] = [KEEP, { kind: "remove" }];

    // act
    const recipes = choices.map((photo) => addedPorridge(photo));

    // assert
    expect(recipes.map((recipe) => recipe.photo)).toEqual([null, null]);
  });

  it.each<{
    change: string;
    photo: RecipePhotoChange;
    after: string | null;
    replaced: string | null;
  }>([
    { change: "keeps", photo: KEEP, after: PHOTO_ID, replaced: null },
    {
      change: "removes",
      photo: { kind: "remove" },
      after: null,
      replaced: PHOTO_ID,
    },
    {
      change: "replaces",
      photo: attaching(NEW_PHOTO_ID),
      after: NEW_PHOTO_ID,
      replaced: PHOTO_ID,
    },
  ])(
    "$change its photo when revised, naming the photo it no longer holds",
    ({ photo, after, replaced }) => {
      // arrange
      const recipe = addedPorridge(attaching(PHOTO_ID));

      // act
      const revision = recipe.revised({
        draft: validDraft(PORRIDGE),
        photo,
        at: REVISED_AT,
      });

      // assert
      expect(revision.recipe.photo?.photoId ?? null).toBe(after);
      expect(revision.replacedPhoto?.photoId ?? null).toBe(replaced);
    },
  );

  it("names no replaced photo when a recipe without one gains its first", () => {
    // arrange
    const recipe = addedPorridge();

    // act
    const revision = recipe.revised({
      draft: validDraft(PORRIDGE),
      photo: attaching(NEW_PHOTO_ID),
      at: REVISED_AT,
    });

    // assert
    expect(revision.recipe.photo?.photoId).toBe(NEW_PHOTO_ID);
    expect(revision.replacedPhoto).toBeNull();
  });

  it("is reconstituted with its stored photo", () => {
    // arrange
    const snapshot = addedPorridge(attaching(PHOTO_ID)).toSnapshot();

    // act
    const recipe = Recipe.reconstitute(snapshot);

    // assert
    expect(recipe.photo?.isStoredAs(PHOTO_ID)).toBe(true);
    expect(recipe.toSnapshot()).toEqual(snapshot);
  });
});
