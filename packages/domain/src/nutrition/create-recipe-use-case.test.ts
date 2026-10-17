import { describe, expect, it, vi } from "vitest";

import { CreateRecipeUseCase } from "./create-recipe-use-case";
import { Food } from "./food";
import type { NutritionLibraryIncidents } from "./nutrition-library-incidents";
import type { NutritionTag } from "./nutrition-tags";
import { Recipe } from "./recipe";
import type { RecipeDraftInput } from "./recipe-draft";
import type { RecipeAddition } from "./recipe-library";

const STORED_AT = new Date("2026-10-13T09:00:00.000Z");
const NOW = new Date("2026-10-14T09:00:00.000Z");
const COACH_ACCOUNT_ID = "coach-account-1";
const OTHER_COACH_ACCOUNT_ID = "coach-account-2";

const TAGS: NutritionTag[] = [
  { id: "mt-breakfast", family: "meal-time", label: "Breakfast", order: 1 },
  { id: "di-vegetarian", family: "dietary", label: "Vegetarian", order: 15 },
];

function foodCalled(id: string, ownerAccountId: string): Food {
  return Food.reconstitute({
    id,
    ownerAccountId,
    name: id,
    category: "carb",
    icon: "grain",
    kcal: 100,
    protein: 1,
    carb: 20,
    fat: 1,
    defaultPortionGrams: 100,
    tagIds: [],
    archivedAt: null,
    createdAt: STORED_AT,
    updatedAt: STORED_AT,
  });
}

function recipeCalled(id: string, name: string, ownerAccountId: string) {
  return Recipe.reconstitute({
    id,
    ownerAccountId,
    name,
    ingredients: [],
    prepMinutes: 0,
    cookMinutes: 0,
    instructions: "",
    icon: null,
    mealRoleIds: [],
    tagIds: [],
    archivedAt: null,
    createdAt: STORED_AT,
    updatedAt: STORED_AT,
  });
}

const OATS = foodCalled("food-oats", COACH_ACCOUNT_ID);
const MILK = foodCalled("food-milk", COACH_ACCOUNT_ID);
const OTHER_COACHS_RICE = foodCalled("food-rice", OTHER_COACH_ACCOUNT_ID);
const OMELETTE = recipeCalled("recipe-1", "Omelette", COACH_ACCOUNT_ID);
const OTHER_COACHS_PANCAKES = recipeCalled(
  "recipe-2",
  "Pancakes",
  OTHER_COACH_ACCOUNT_ID,
);

const PORRIDGE: RecipeDraftInput = {
  name: "  Porridge ",
  ingredients: [
    { foodId: "food-oats", grams: 40, method: "boiled" },
    { foodId: "food-milk", grams: 250, method: "raw" },
  ],
  prepMinutes: 5,
  cookMinutes: 10,
  instructions: "Simmer the oats in the milk.",
  icon: "pot",
  tagIds: ["di-vegetarian", "mt-breakfast"],
};

function createUseCase() {
  const storedRecipes = [OMELETTE, OTHER_COACHS_PANCAKES];
  const storedFoods = [MILK, OATS, OTHER_COACHS_RICE];
  const recipes = {
    list: vi.fn(async (ownerAccountId: string) =>
      storedRecipes.filter(
        (recipe) => recipe.toSnapshot().ownerAccountId === ownerAccountId,
      ),
    ),
    add: vi.fn(async (): Promise<RecipeAddition> => "added"),
  };
  const foods = {
    list: vi.fn(async (ownerAccountId: string) =>
      storedFoods.filter(
        (food) => food.toSnapshot().ownerAccountId === ownerAccountId,
      ),
    ),
  };
  const tags = { list: vi.fn(async () => TAGS) };
  const incidents = {
    foodCreationFailed: vi.fn(),
    foodEditFailed: vi.fn(),
    recipeCreationFailed: vi.fn(),
    recipeEditFailed: vi.fn(),
  } satisfies NutritionLibraryIncidents;
  const useCase = new CreateRecipeUseCase({
    recipes,
    foods,
    tags,
    ids: { generate: () => "recipe-3" },
    clock: { now: () => NOW },
    incidents,
  });

  return { useCase, recipes, foods, tags, incidents };
}

describe("CreateRecipeUseCase", () => {
  it("adds the recipe under a new id, owned by the coach who created it, its name trimmed and its meal roles apart from its tags, created now", async () => {
    // arrange
    const { useCase, recipes } = createUseCase();

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      draft: PORRIDGE,
    });

    // assert
    const created = Recipe.reconstitute({
      id: "recipe-3",
      ownerAccountId: COACH_ACCOUNT_ID,
      name: "Porridge",
      ingredients: [
        { foodId: "food-oats", grams: 40, method: "boiled" },
        { foodId: "food-milk", grams: 250, method: "raw" },
      ],
      prepMinutes: 5,
      cookMinutes: 10,
      instructions: "Simmer the oats in the milk.",
      icon: "pot",
      mealRoleIds: ["mt-breakfast"],
      tagIds: ["di-vegetarian"],
      archivedAt: null,
      createdAt: NOW,
      updatedAt: NOW,
    });
    expect(result).toEqual({ status: "created", recipe: created });
    expect(recipes.add).toHaveBeenCalledWith(created);
  });

  it("adds a recipe with no ingredients", async () => {
    // arrange
    const { useCase, recipes } = createUseCase();

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      draft: { ...PORRIDGE, ingredients: [] },
    });

    // assert
    expect(result.status).toBe("created");
    expect(recipes.add).toHaveBeenCalledOnce();
  });

  it("refuses a draft that breaks a rule, naming each problem, without adding it", async () => {
    // arrange
    const { useCase, recipes } = createUseCase();

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      draft: { ...PORRIDGE, name: " ", cookMinutes: 10_000 },
    });

    // assert
    expect(result).toEqual({
      status: "invalid",
      problems: { name: "missing", cookMinutes: "out-of-range" },
    });
    expect(recipes.add).not.toHaveBeenCalled();
  });

  it.each([
    ["another coach's food", "food-rice"],
    ["an unknown food", "food-honey"],
  ])(
    "refuses an ingredient naming %s at its position, without adding it",
    async (_case, foodId) => {
      // arrange
      const { useCase, recipes } = createUseCase();

      // act
      const result = await useCase.execute({
        ownerAccountId: COACH_ACCOUNT_ID,
        draft: {
          ...PORRIDGE,
          ingredients: [
            { foodId: "food-oats", grams: 40, method: "raw" },
            { foodId, grams: 40, method: "raw" },
          ],
        },
      });

      // assert
      expect(result).toEqual({
        status: "invalid",
        problems: { ingredients: [{ position: 1, problem: "unknown-food" }] },
      });
      expect(recipes.add).not.toHaveBeenCalled();
    },
  );

  it("refuses a name another of her recipes already has, whatever its case and spaces, without adding it", async () => {
    // arrange
    const { useCase, recipes } = createUseCase();

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      draft: { ...PORRIDGE, name: " OMELETTE  " },
    });

    // assert
    expect(result).toEqual({ status: "invalid", problems: { name: "taken" } });
    expect(recipes.add).not.toHaveBeenCalled();
  });

  it("adds a name only another coach's recipe has", async () => {
    // arrange
    const { useCase, recipes } = createUseCase();

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      draft: { ...PORRIDGE, name: "pancakes" },
    });

    // assert
    expect(result.status).toBe("created");
    expect(recipes.add).toHaveBeenCalledOnce();
  });

  it("refuses the name when the library finds it taken by a recipe added meanwhile", async () => {
    // arrange
    const { useCase, recipes } = createUseCase();
    recipes.add.mockResolvedValueOnce("name-taken");

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      draft: PORRIDGE,
    });

    // assert
    expect(result).toEqual({ status: "invalid", problems: { name: "taken" } });
  });

  it("reports a failed read of her foods and answers that the creation failed without adding it", async () => {
    // arrange
    const failure = new Error("connection terminated");
    const { useCase, recipes, foods, incidents } = createUseCase();
    foods.list.mockRejectedValueOnce(failure);

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      draft: PORRIDGE,
    });

    // assert
    expect(result).toEqual({ status: "failed" });
    expect(recipes.add).not.toHaveBeenCalled();
    expect(incidents.recipeCreationFailed).toHaveBeenCalledWith({
      error: failure,
    });
  });

  it("reports a failed write and answers that the creation failed", async () => {
    // arrange
    const failure = new Error("connection terminated");
    const { useCase, recipes, incidents } = createUseCase();
    recipes.add.mockRejectedValueOnce(failure);

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      draft: PORRIDGE,
    });

    // assert
    expect(result).toEqual({ status: "failed" });
    expect(incidents.recipeCreationFailed).toHaveBeenCalledWith({
      error: failure,
    });
  });
});
