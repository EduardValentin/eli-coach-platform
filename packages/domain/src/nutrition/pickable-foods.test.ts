import { describe, expect, it } from "vitest";

import { Food } from "./food";
import { Recipe } from "./recipe";

const AT = new Date("2026-10-14T09:00:00.000Z");
const ARCHIVED_AT = new Date("2026-10-15T09:00:00.000Z");
const COACH_ACCOUNT_ID = "coach-account-1";

function foodCalled(
  id: string,
  name: string,
  archivedAt: Date | null = null,
): Food {
  return Food.reconstitute({
    id,
    ownerAccountId: COACH_ACCOUNT_ID,
    name,
    category: "carb",
    icon: "grain",
    kcal: 100,
    protein: 1,
    carb: 20,
    fat: 1,
    defaultPortionGrams: 100,
    tagIds: [],
    archivedAt,
    createdAt: AT,
    updatedAt: AT,
  });
}

const OATS = foodCalled("food-oats", "Oats");
const MILK = foodCalled("food-milk", "Milk");
const HONEY = foodCalled("food-honey", "Honey", ARCHIVED_AT);
const SYRUP = foodCalled("food-syrup", "Syrup", ARCHIVED_AT);

const PORRIDGE = Recipe.reconstitute({
  id: "recipe-1",
  ownerAccountId: COACH_ACCOUNT_ID,
  name: "Porridge",
  ingredients: [
    { foodId: "food-oats", grams: 40, method: "boiled" },
    { foodId: "food-honey", grams: 10, method: "raw" },
    { foodId: "food-honey", grams: 5, method: "raw" },
  ],
  prepMinutes: 5,
  cookMinutes: 10,
  instructions: "",
  icon: null,
  mealRoleIds: [],
  tagIds: [],
  archivedAt: null,
  createdAt: AT,
  updatedAt: AT,
});

describe("PickableFoods", () => {
  it("offers a recipe not yet stored every active food and places nothing beyond them", () => {
    // arrange
    const activeFoods = [MILK, OATS];

    // act
    const pickable = Recipe.pickableFoodsForNew(activeFoods);

    // assert
    expect(pickable.toSnapshot()).toEqual({
      offered: [MILK, OATS],
      placedOnly: [],
    });
    expect(pickable.ids).toEqual(["food-milk", "food-oats"]);
  });

  it("offers a stored recipe every active food and keeps the archived foods it already uses as placed only, each once", () => {
    // arrange
    const activeFoods = [MILK, OATS];
    const referencedFoods = [HONEY, OATS];

    // act
    const pickable = PORRIDGE.pickableFoods({ activeFoods, referencedFoods });

    // assert
    expect(pickable.toSnapshot()).toEqual({
      offered: [MILK, OATS],
      placedOnly: [HONEY],
    });
    expect(pickable.ids).toEqual(["food-milk", "food-oats", "food-honey"]);
  });

  it("places only foods the recipe uses, whatever else the referenced foods hold", () => {
    // arrange
    const activeFoods = [OATS];
    const referencedFoods = [HONEY, SYRUP];

    // act
    const pickable = PORRIDGE.pickableFoods({ activeFoods, referencedFoods });

    // assert
    expect(pickable.toSnapshot().placedOnly).toEqual([HONEY]);
    expect(pickable.ids).not.toContain("food-syrup");
  });
});
