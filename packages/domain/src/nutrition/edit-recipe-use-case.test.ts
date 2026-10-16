import { describe, expect, it, vi } from "vitest";

import { EditRecipeUseCase } from "./edit-recipe-use-case";
import { Food } from "./food";
import type { FoodsReference } from "./food-library";
import type { NutritionLibraryIncidents } from "./nutrition-library-incidents";
import type { NutritionTag } from "./nutrition-tags";
import { Recipe, type RecipeSnapshot } from "./recipe";
import type { RecipeDraftInput } from "./recipe-draft";
import type { RecipeReference, RecipeReplacement } from "./recipe-library";

const CREATED_AT = new Date("2026-10-13T09:00:00.000Z");
const ARCHIVED_AT = new Date("2026-10-13T12:00:00.000Z");
const NOW = new Date("2026-10-14T09:00:00.000Z");
const COACH_ACCOUNT_ID = "coach-account-1";
const OTHER_COACH_ACCOUNT_ID = "coach-account-2";

const TAGS: NutritionTag[] = [
  { id: "mt-breakfast", family: "meal-time", label: "Breakfast", order: 1 },
  { id: "mt-snack", family: "meal-time", label: "Snack", order: 4 },
  { id: "cp-luteal", family: "cycle-phase", label: "Luteal", order: 10 },
];

function foodCalled(
  id: string,
  ownerAccountId: string,
  archivedAt: Date | null = null,
): Food {
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
    archivedAt,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  });
}

const OATS = foodCalled("food-oats", COACH_ACCOUNT_ID);
const MILK = foodCalled("food-milk", COACH_ACCOUNT_ID);
const HONEY = foodCalled("food-honey", COACH_ACCOUNT_ID, ARCHIVED_AT);
const SYRUP = foodCalled("food-syrup", COACH_ACCOUNT_ID, ARCHIVED_AT);
const OTHER_COACHS_RICE = foodCalled("food-rice", OTHER_COACH_ACCOUNT_ID);

const PORRIDGE: RecipeSnapshot = {
  id: "recipe-1",
  ownerAccountId: COACH_ACCOUNT_ID,
  name: "Porridge",
  ingredients: [
    { foodId: "food-oats", grams: 40, method: "boiled" },
    { foodId: "food-honey", grams: 10, method: "raw" },
  ],
  prepMinutes: 5,
  cookMinutes: 10,
  instructions: "Simmer the oats.",
  icon: "pot",
  mealRoleIds: ["mt-breakfast"],
  tagIds: [],
  archivedAt: null,
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
};

function recipeCalled(id: string, name: string, ownerAccountId: string) {
  return Recipe.reconstitute({ ...PORRIDGE, id, name, ownerAccountId });
}

const OMELETTE = recipeCalled("recipe-2", "Omelette", COACH_ACCOUNT_ID);
const OTHER_COACHS_PANCAKES = recipeCalled(
  "recipe-3",
  "Pancakes",
  OTHER_COACH_ACCOUNT_ID,
);

const MILKY_OATS: RecipeDraftInput = {
  name: " Milky oats ",
  ingredients: [
    { foodId: "food-milk", grams: 200, method: "steamed" },
    { foodId: "food-honey", grams: 15, method: "raw" },
    { foodId: "food-oats", grams: 50, method: "raw" },
  ],
  prepMinutes: 2,
  cookMinutes: 0,
  instructions: "Warm the milk.",
  icon: null,
  tagIds: ["cp-luteal", "mt-snack"],
};

function createUseCase() {
  const storedRecipes = [
    Recipe.reconstitute(PORRIDGE),
    OMELETTE,
    OTHER_COACHS_PANCAKES,
  ];
  const storedFoods = [HONEY, MILK, OATS, SYRUP, OTHER_COACHS_RICE];
  const recipesOf = (ownerAccountId: string) =>
    storedRecipes.filter(
      (recipe) => recipe.toSnapshot().ownerAccountId === ownerAccountId,
    );
  const foodsOf = (ownerAccountId: string) =>
    storedFoods.filter(
      (food) => food.toSnapshot().ownerAccountId === ownerAccountId,
    );
  const recipes = {
    list: vi.fn(async (ownerAccountId: string) => recipesOf(ownerAccountId)),
    find: vi.fn(
      async ({ ownerAccountId, recipeId }: RecipeReference) =>
        recipesOf(ownerAccountId).find(({ id }) => id === recipeId) ?? null,
    ),
    replace: vi.fn(async (): Promise<RecipeReplacement> => "replaced"),
  };
  const foods = {
    list: vi.fn(async (ownerAccountId: string) =>
      foodsOf(ownerAccountId).filter(
        (food) => food.toSnapshot().archivedAt === null,
      ),
    ),
    referenced: vi.fn(async ({ ownerAccountId, foodIds }: FoodsReference) =>
      foodsOf(ownerAccountId).filter(({ id }) => foodIds.includes(id)),
    ),
  };
  const tags = { list: vi.fn(async () => TAGS) };
  const incidents = {
    foodCreationFailed: vi.fn(),
    foodEditFailed: vi.fn(),
    recipeCreationFailed: vi.fn(),
    recipeEditFailed: vi.fn(),
  } satisfies NutritionLibraryIncidents;
  const useCase = new EditRecipeUseCase({
    recipes,
    foods,
    tags,
    clock: { now: () => NOW },
    incidents,
  });

  return { useCase, recipes, foods, incidents };
}

describe("EditRecipeUseCase", () => {
  it("replaces her recipe as a whole, ingredients and tags included, keeping its id, owner and creation moment, updated now", async () => {
    // arrange
    const { useCase, recipes } = createUseCase();

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      recipeId: "recipe-1",
      draft: MILKY_OATS,
    });

    // assert
    const edited = Recipe.reconstitute({
      ...PORRIDGE,
      name: "Milky oats",
      ingredients: [
        { foodId: "food-milk", grams: 200, method: "steamed" },
        { foodId: "food-honey", grams: 15, method: "raw" },
        { foodId: "food-oats", grams: 50, method: "raw" },
      ],
      prepMinutes: 2,
      cookMinutes: 0,
      instructions: "Warm the milk.",
      icon: null,
      mealRoleIds: ["mt-snack"],
      tagIds: ["cp-luteal"],
      updatedAt: NOW,
    });
    expect(result).toEqual({ status: "edited", recipe: edited });
    expect(recipes.replace).toHaveBeenCalledWith(edited);
  });

  it("reads the referenced foods only for the foods the stored recipe uses", async () => {
    // arrange
    const { useCase, foods } = createUseCase();

    // act
    await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      recipeId: "recipe-1",
      draft: MILKY_OATS,
    });

    // assert
    expect(foods.referenced).toHaveBeenCalledWith({
      ownerAccountId: COACH_ACCOUNT_ID,
      foodIds: ["food-oats", "food-honey"],
    });
  });

  it("keeps its own name, recased and spaced", async () => {
    // arrange
    const { useCase } = createUseCase();

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      recipeId: "recipe-1",
      draft: { ...MILKY_OATS, name: "  PORRIDGE " },
    });

    // assert
    expect(result.status).toBe("edited");
  });

  it("refuses a rename onto another of her recipes, without replacing it", async () => {
    // arrange
    const { useCase, recipes } = createUseCase();

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      recipeId: "recipe-1",
      draft: { ...MILKY_OATS, name: "omelette" },
    });

    // assert
    expect(result).toEqual({ status: "invalid", problems: { name: "taken" } });
    expect(recipes.replace).not.toHaveBeenCalled();
  });

  it("renames onto a name only another coach's recipe has", async () => {
    // arrange
    const { useCase } = createUseCase();

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      recipeId: "recipe-1",
      draft: { ...MILKY_OATS, name: "Pancakes" },
    });

    // assert
    expect(result.status).toBe("edited");
  });

  it.each([
    ["an archived food the recipe does not use yet", "food-syrup"],
    ["another coach's food", "food-rice"],
    ["an unknown food", "food-butter"],
  ])(
    "refuses an ingredient naming %s at its position, without replacing the recipe",
    async (_case, foodId) => {
      // arrange
      const { useCase, recipes } = createUseCase();

      // act
      const result = await useCase.execute({
        ownerAccountId: COACH_ACCOUNT_ID,
        recipeId: "recipe-1",
        draft: {
          ...MILKY_OATS,
          ingredients: [
            { foodId: "food-honey", grams: 10, method: "raw" },
            { foodId, grams: 10, method: "raw" },
          ],
        },
      });

      // assert
      expect(result).toEqual({
        status: "invalid",
        problems: { ingredients: [{ position: 1, problem: "unknown-food" }] },
      });
      expect(recipes.replace).not.toHaveBeenCalled();
    },
  );

  it("refuses a draft that breaks a rule, without replacing the recipe", async () => {
    // arrange
    const { useCase, recipes } = createUseCase();

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      recipeId: "recipe-1",
      draft: { ...MILKY_OATS, instructions: "i".repeat(2_001) },
    });

    // assert
    expect(result).toEqual({
      status: "invalid",
      problems: { instructions: "too-long" },
    });
    expect(recipes.replace).not.toHaveBeenCalled();
  });

  it("refuses the name when the library finds it taken by a recipe renamed meanwhile", async () => {
    // arrange
    const { useCase, recipes } = createUseCase();
    recipes.replace.mockResolvedValueOnce("name-taken");

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      recipeId: "recipe-1",
      draft: MILKY_OATS,
    });

    // assert
    expect(result).toEqual({ status: "invalid", problems: { name: "taken" } });
  });

  it.each([
    ["an unknown recipe", "recipe-9"],
    ["another coach's recipe", "recipe-3"],
  ])("finds nothing to edit for %s", async (_case, recipeId) => {
    // arrange
    const { useCase, recipes } = createUseCase();

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      recipeId,
      draft: MILKY_OATS,
    });

    // assert
    expect(result).toEqual({ status: "not-found" });
    expect(recipes.replace).not.toHaveBeenCalled();
  });

  it("reports a failed write with the recipe's id and answers that the edit failed", async () => {
    // arrange
    const failure = new Error("connection terminated");
    const { useCase, recipes, incidents } = createUseCase();
    recipes.replace.mockRejectedValueOnce(failure);

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      recipeId: "recipe-1",
      draft: MILKY_OATS,
    });

    // assert
    expect(result).toEqual({ status: "failed" });
    expect(incidents.recipeEditFailed).toHaveBeenCalledWith({
      recipeId: "recipe-1",
      error: failure,
    });
  });
});
