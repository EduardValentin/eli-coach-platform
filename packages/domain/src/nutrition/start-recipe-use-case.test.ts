import { describe, expect, it, vi } from "vitest";

import { Food } from "./food";
import type { NutritionTag } from "./nutrition-tags";
import { Recipe } from "./recipe";
import { StartRecipeUseCase } from "./start-recipe-use-case";

const AT = new Date("2026-10-14T09:00:00.000Z");
const COACH_ACCOUNT_ID = "coach-account-1";

const TAGS: NutritionTag[] = [
  { id: "mt-breakfast", family: "meal-time", label: "Breakfast", order: 1 },
];

const OATS = Food.reconstitute({
  id: "food-oats",
  ownerAccountId: COACH_ACCOUNT_ID,
  name: "Oats",
  category: "carb",
  icon: "grain",
  kcal: 389,
  protein: 16.9,
  carb: 66.3,
  fat: 6.9,
  defaultPortionGrams: 40,
  tagIds: [],
  archivedAt: null,
  createdAt: AT,
  updatedAt: AT,
});

const OMELETTE = Recipe.reconstitute({
  id: "recipe-1",
  ownerAccountId: COACH_ACCOUNT_ID,
  name: "Omelette",
  ingredients: [],
  prepMinutes: 0,
  cookMinutes: 0,
  instructions: "",
  icon: null,
  mealRoleIds: [],
  tagIds: [],
  photo: null,
  archivedAt: null,
  createdAt: AT,
  updatedAt: AT,
});

describe("StartRecipeUseCase", () => {
  it("opens a blank recipe offering her active foods, with the names of her recipes and the tag vocabulary", async () => {
    // arrange
    const recipes = { list: vi.fn(async () => [OMELETTE]) };
    const foods = { list: vi.fn(async () => [OATS]) };
    const tags = { list: vi.fn(async () => TAGS) };
    const useCase = new StartRecipeUseCase({ recipes, foods, tags });

    // act
    const result = await useCase.execute(COACH_ACCOUNT_ID);

    // assert
    expect(result).toEqual({
      status: "started",
      pickableFoods: Recipe.pickableFoodsForNew([OATS]),
      otherNames: ["Omelette"],
      tags: TAGS,
    });
    expect(result.pickableFoods.toSnapshot()).toEqual({
      offered: [OATS],
      placedOnly: [],
    });
    expect(recipes.list).toHaveBeenCalledWith(COACH_ACCOUNT_ID);
    expect(foods.list).toHaveBeenCalledWith(COACH_ACCOUNT_ID);
  });
});
