import { describe, expect, it, vi } from "vitest";

import { Food } from "./food";
import type { FoodsReference } from "./food-library";
import { FindRecipeUseCase } from "./find-recipe-use-case";
import type { NutritionTag } from "./nutrition-tags";
import { Recipe } from "./recipe";

const AT = new Date("2026-10-14T09:00:00.000Z");
const COACH_ACCOUNT_ID = "coach-account-1";
const OTHER_COACH_ACCOUNT_ID = "coach-account-2";

const TAGS: NutritionTag[] = [
  { id: "mt-breakfast", family: "meal-time", label: "Breakfast", order: 1 },
];

function foodCalled(id: string, archivedAt: Date | null = null): Food {
  return Food.reconstitute({
    id,
    ownerAccountId: COACH_ACCOUNT_ID,
    name: id,
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

function recipeCalled(
  id: string,
  name: string,
  ownerAccountId: string,
): Recipe {
  return Recipe.reconstitute({
    id,
    ownerAccountId,
    name,
    ingredients: [
      { foodId: "food-oats", grams: 40, method: "boiled" },
      { foodId: "food-honey", grams: 10, method: "raw" },
    ],
    prepMinutes: 5,
    cookMinutes: 10,
    instructions: "",
    icon: null,
    mealRoleIds: [],
    tagIds: [],
    photo: null,
    archivedAt: null,
    createdAt: AT,
    updatedAt: AT,
  });
}

const OATS = foodCalled("food-oats");
const MILK = foodCalled("food-milk");
const HONEY = foodCalled("food-honey", AT);
const PORRIDGE = recipeCalled("recipe-1", "Porridge", COACH_ACCOUNT_ID);
const OMELETTE = recipeCalled("recipe-2", "Omelette", COACH_ACCOUNT_ID);
const OTHER_COACHS_PANCAKES = recipeCalled(
  "recipe-3",
  "Pancakes",
  OTHER_COACH_ACCOUNT_ID,
);

function createUseCase() {
  const stored = [OMELETTE, PORRIDGE, OTHER_COACHS_PANCAKES];
  const recipes = {
    list: vi.fn(async (ownerAccountId: string) =>
      stored.filter(
        (recipe) => recipe.toSnapshot().ownerAccountId === ownerAccountId,
      ),
    ),
  };
  const foods = {
    list: vi.fn(async () => [MILK, OATS]),
    referenced: vi.fn(async ({ foodIds }: FoodsReference) =>
      [HONEY, MILK, OATS].filter(({ id }) => foodIds.includes(id)),
    ),
  };
  const tags = { list: vi.fn(async () => TAGS) };
  const useCase = new FindRecipeUseCase({ recipes, foods, tags });

  return { useCase, recipes, foods };
}

describe("FindRecipeUseCase", () => {
  it("finds her recipe in one read of her library, offering her active foods and keeping the archived ones it uses as placed only, with the names of her other recipes and the tag vocabulary", async () => {
    // arrange
    const { useCase, recipes, foods } = createUseCase();

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      recipeId: "recipe-1",
    });

    // assert
    expect(result).toEqual({
      status: "found",
      recipe: PORRIDGE,
      pickableFoods: PORRIDGE.pickableFoods({
        activeFoods: [MILK, OATS],
        referencedFoods: [HONEY, OATS],
      }),
      otherNames: ["Omelette"],
      tags: TAGS,
    });
    expect(
      result.status === "found" && result.pickableFoods.toSnapshot(),
    ).toEqual({ offered: [MILK, OATS], placedOnly: [HONEY] });
    expect(recipes.list).toHaveBeenCalledOnce();
    expect(foods.referenced).toHaveBeenCalledWith({
      ownerAccountId: COACH_ACCOUNT_ID,
      foodIds: ["food-oats", "food-honey"],
    });
  });

  it.each([
    ["an unknown recipe", "recipe-9"],
    ["another coach's recipe", "recipe-3"],
  ])("finds nothing for %s", async (_case, recipeId) => {
    // arrange
    const { useCase, foods } = createUseCase();

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      recipeId,
    });

    // assert
    expect(result).toEqual({ status: "not-found" });
    expect(foods.referenced).not.toHaveBeenCalled();
  });
});
