import { describe, expect, it } from "vitest";

import { Food } from "./food";
import { FoodDraft, type FoodDraftInput } from "./food-draft";

const ADDED_AT = new Date("2026-10-14T09:00:00.000Z");
const REVISED_AT = new Date("2026-10-15T09:00:00.000Z");
const COACH_ACCOUNT_ID = "coach-account-1";

const OATS: FoodDraftInput = {
  name: "Oats",
  category: "carb",
  icon: "grain",
  kcal: 389,
  protein: 16.9,
  carb: 66.3,
  fat: 6.9,
  defaultPortionGrams: 40,
  tagIds: ["mt-breakfast"],
};

function validDraft(input: FoodDraftInput): FoodDraft {
  const result = FoodDraft.from(input, {
    otherNames: [],
    knownTagIds: ["mt-breakfast", "di-vegetarian"],
  });

  if (result.status !== "valid") {
    throw new Error("The draft is meant to be valid.");
  }

  return result.draft;
}

describe("Food", () => {
  it("is added with its draft, owned by the coach who added it, active, created and updated at the same moment", () => {
    // arrange
    const draft = validDraft(OATS);

    // act
    const food = Food.added({
      id: "food-1",
      ownerAccountId: COACH_ACCOUNT_ID,
      draft,
      at: ADDED_AT,
    });

    // assert
    expect(food.toSnapshot()).toEqual({
      id: "food-1",
      ownerAccountId: COACH_ACCOUNT_ID,
      ...draft.toSnapshot(),
      archivedAt: null,
      createdAt: ADDED_AT,
      updatedAt: ADDED_AT,
    });
  });

  it("is revised as a whole, keeping its id, its owner, its state and the moment it was created", () => {
    // arrange
    const food = Food.added({
      id: "food-1",
      ownerAccountId: COACH_ACCOUNT_ID,
      draft: validDraft(OATS),
      at: ADDED_AT,
    });
    const revision = validDraft({
      ...OATS,
      name: "Rolled oats",
      kcal: 375,
      tagIds: ["di-vegetarian"],
    });

    // act
    const revised = food.revised(revision, REVISED_AT);

    // assert
    expect(revised.toSnapshot()).toEqual({
      id: "food-1",
      ownerAccountId: COACH_ACCOUNT_ID,
      ...revision.toSnapshot(),
      archivedAt: null,
      createdAt: ADDED_AT,
      updatedAt: REVISED_AT,
    });
  });

  it("answers its id and name", () => {
    // arrange
    const food = Food.added({
      id: "food-1",
      ownerAccountId: COACH_ACCOUNT_ID,
      draft: validDraft(OATS),
      at: ADDED_AT,
    });

    // act
    const identity = { id: food.id, name: food.name };

    // assert
    expect(identity).toEqual({ id: "food-1", name: "Oats" });
  });

  it("hands out a snapshot its holder cannot change the food through", () => {
    // arrange
    const food = Food.added({
      id: "food-1",
      ownerAccountId: COACH_ACCOUNT_ID,
      draft: validDraft(OATS),
      at: ADDED_AT,
    });

    // act
    food.toSnapshot().tagIds.push("di-vegetarian");

    // assert
    expect(food.toSnapshot().tagIds).toEqual(["mt-breakfast"]);
  });
});
