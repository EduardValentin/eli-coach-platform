import { describe, expect, it, vi } from "vitest";

import { Food } from "./food";
import type { FoodsReference } from "./food-library-port";
import { ListRecipesUseCase } from "./list-recipes-use-case";
import type { NutritionTag } from "./nutrition-tags-port";
import { Recipe } from "./recipe";

const AT = new Date("2026-10-14T09:00:00.000Z");
const COACH_ACCOUNT_ID = "coach-account-1";

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

function recipeUsing(id: string, foodIds: string[]): Recipe {
  return Recipe.reconstitute({
    id,
    ownerAccountId: COACH_ACCOUNT_ID,
    name: id,
    ingredients: foodIds.map((foodId) => ({
      foodId,
      grams: 50,
      method: "raw",
    })),
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
}

const OATS = foodCalled("food-oats");
const MILK = foodCalled("food-milk");
const HONEY = foodCalled("food-honey", AT);

function createUseCase(stored: { recipes: Recipe[]; foods: Food[] }) {
  const recipes = { list: vi.fn(async () => stored.recipes) };
  const foods = {
    list: vi.fn(async () =>
      stored.foods.filter((food) => food.toSnapshot().archivedAt === null),
    ),
    referenced: vi.fn(async ({ foodIds }: FoodsReference) =>
      stored.foods.filter(({ id }) => foodIds.includes(id)),
    ),
  };
  const tags = { list: vi.fn(async () => TAGS) };
  const useCase = new ListRecipesUseCase({ recipes, foods, tags });

  return { useCase, recipes, foods };
}

describe("ListRecipesUseCase", () => {
  it("lists her recipes with her active foods, the archived foods a recipe still uses, and the tag vocabulary", async () => {
    // arrange
    const porridge = recipeUsing("recipe-1", ["food-oats", "food-honey"]);
    const shake = recipeUsing("recipe-2", ["food-milk", "food-honey"]);
    const { useCase, recipes, foods } = createUseCase({
      recipes: [porridge, shake],
      foods: [HONEY, MILK, OATS],
    });

    // act
    const result = await useCase.execute(COACH_ACCOUNT_ID);

    // assert
    expect(result).toEqual({
      status: "listed",
      recipes: [porridge, shake],
      foods: [MILK, OATS, HONEY],
      tags: TAGS,
    });
    expect(recipes.list).toHaveBeenCalledWith(COACH_ACCOUNT_ID);
    expect(foods.referenced).toHaveBeenCalledWith({
      ownerAccountId: COACH_ACCOUNT_ID,
      foodIds: ["food-honey"],
    });
  });

  it("reads no referenced foods when every food her recipes use is active", async () => {
    // arrange
    const porridge = recipeUsing("recipe-1", ["food-oats", "food-milk"]);
    const { useCase, foods } = createUseCase({
      recipes: [porridge],
      foods: [MILK, OATS],
    });

    // act
    const result = await useCase.execute(COACH_ACCOUNT_ID);

    // assert
    expect(result.foods).toEqual([MILK, OATS]);
    expect(foods.referenced).not.toHaveBeenCalled();
  });
});
