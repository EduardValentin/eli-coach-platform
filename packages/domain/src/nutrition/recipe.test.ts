import { describe, expect, it } from "vitest";

import { Recipe } from "./recipe";
import { RecipeDraft, type RecipeDraftInput } from "./recipe-draft";

const ADDED_AT = new Date("2026-10-14T09:00:00.000Z");
const REVISED_AT = new Date("2026-10-15T09:00:00.000Z");
const COACH_ACCOUNT_ID = "coach-account-1";

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

function addedPorridge(): Recipe {
  return Recipe.added({
    id: "recipe-1",
    ownerAccountId: COACH_ACCOUNT_ID,
    draft: validDraft(PORRIDGE),
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
      at: ADDED_AT,
    });

    // assert
    expect(recipe.toSnapshot()).toEqual({
      id: "recipe-1",
      ownerAccountId: COACH_ACCOUNT_ID,
      ...draft.toSnapshot(),
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
    const revised = recipe.revised(draft, REVISED_AT);

    // assert
    expect(revised.toSnapshot()).toEqual({
      id: "recipe-1",
      ownerAccountId: COACH_ACCOUNT_ID,
      ...draft.toSnapshot(),
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
});
