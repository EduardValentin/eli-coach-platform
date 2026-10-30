import { describe, expect, it, vi } from "vitest";

import { EditRecipeUseCase } from "./edit-recipe-use-case";
import { Food } from "./food";
import type { FoodsReference } from "./food-library-port";
import type { NutritionLibraryIncidentsPort } from "./nutrition-library-incidents-port";
import type { NutritionTag } from "./nutrition-tags-port";
import { Recipe, type RecipeSnapshot } from "./recipe";
import type { RecipeDraftInput } from "./recipe-draft";
import type { RecipeReference, RecipeReplacement } from "./recipe-library-port";
import type { RecipePhotoChoice } from "./recipe-photo";
import type { RecipePhotoRendition } from "./recipe-photo-renditions-port";
import { RecipePhotoSaving } from "./recipe-photo-saving";

const CREATED_AT = new Date("2026-10-13T09:00:00.000Z");
const ARCHIVED_AT = new Date("2026-10-13T12:00:00.000Z");
const NOW = new Date("2026-10-14T09:00:00.000Z");
const COACH_ACCOUNT_ID = "coach-account-1";
const OTHER_COACH_ACCOUNT_ID = "coach-account-2";
const STORED_PHOTO_ID = "7a1b0000-0000-4000-8000-000000000001";
const NEW_PHOTO_ID = "7a1b0000-0000-4000-8000-000000000002";
const RECEIVED_PHOTO = new Uint8Array([0xff, 0xd8, 0xff]);
const RENDERED_PHOTO = new Uint8Array([0x52, 0x49, 0x46, 0x46]);
const KEEP: RecipePhotoChoice = { kind: "keep" };
const ATTACH: RecipePhotoChoice = { kind: "attach", bytes: RECEIVED_PHOTO };

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
  photo: null,
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

function createUseCase(porridge: RecipeSnapshot = PORRIDGE) {
  const storedRecipes = [
    Recipe.reconstitute(porridge),
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
    replace: vi.fn(
      async (_recipe: Recipe): Promise<RecipeReplacement> => "replaced",
    ),
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
    recipePhotoCleanupFailed: vi.fn(),
  } satisfies NutritionLibraryIncidentsPort;
  const renditions = {
    render: vi.fn(async (): Promise<RecipePhotoRendition> => ({
      status: "rendered",
      bytes: RENDERED_PHOTO,
    })),
  };
  const photoStore = {
    store: vi.fn(async (_photoId: string, _bytes: Uint8Array) => undefined),
    remove: vi.fn(async (_photoId: string) => undefined),
  };
  const useCase = new EditRecipeUseCase({
    recipes,
    foods,
    tags,
    clock: { now: () => NOW },
    incidents,
    photos: new RecipePhotoSaving({
      renditions,
      ids: { generate: () => NEW_PHOTO_ID },
      store: photoStore,
      incidents,
    }),
  });

  return { useCase, recipes, foods, incidents, renditions, photoStore };
}

describe("EditRecipeUseCase", () => {
  it("replaces her recipe as a whole, ingredients and tags included, keeping its id, owner and creation moment, updated now", async () => {
    // arrange
    const { useCase, recipes } = createUseCase();

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      recipeId: "recipe-1",
      photo: KEEP,
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
      photo: KEEP,
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
      photo: KEEP,
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
      photo: KEEP,
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
      photo: KEEP,
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
        photo: KEEP,
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
      photo: KEEP,
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
      photo: KEEP,
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
      photo: KEEP,
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
      photo: KEEP,
      draft: MILKY_OATS,
    });

    // assert
    expect(result).toEqual({ status: "failed" });
    expect(incidents.recipeEditFailed).toHaveBeenCalledWith({
      recipeId: "recipe-1",
      error: failure,
    });
  });

  describe("with a stored photo", () => {
    const PHOTOGRAPHED: RecipeSnapshot = {
      ...PORRIDGE,
      photo: { photoId: STORED_PHOTO_ID },
    };

    function writtenPhotoOf(
      recipes: ReturnType<typeof createUseCase>["recipes"],
    ) {
      return recipes.replace.mock.calls[0]?.[0].toSnapshot().photo;
    }

    it("keeps the stored photo, rendering, storing and removing nothing", async () => {
      // arrange
      const { useCase, recipes, renditions, photoStore } =
        createUseCase(PHOTOGRAPHED);

      // act
      const result = await useCase.execute({
        ownerAccountId: COACH_ACCOUNT_ID,
        recipeId: "recipe-1",
        draft: MILKY_OATS,
        photo: KEEP,
      });

      // assert
      expect(result.status).toBe("edited");
      expect(writtenPhotoOf(recipes)).toEqual({ photoId: STORED_PHOTO_ID });
      expect(renditions.render).not.toHaveBeenCalled();
      expect(photoStore.store).not.toHaveBeenCalled();
      expect(photoStore.remove).not.toHaveBeenCalled();
    });

    it("removes the stored photo's file once the recipe without it is written", async () => {
      // arrange
      const { useCase, recipes, photoStore } = createUseCase(PHOTOGRAPHED);

      // act
      const result = await useCase.execute({
        ownerAccountId: COACH_ACCOUNT_ID,
        recipeId: "recipe-1",
        draft: MILKY_OATS,
        photo: { kind: "remove" },
      });

      // assert
      expect(result.status).toBe("edited");
      expect(writtenPhotoOf(recipes)).toBeNull();
      expect(photoStore.remove).toHaveBeenCalledExactlyOnceWith(
        STORED_PHOTO_ID,
      );
      expect(recipes.replace.mock.invocationCallOrder[0]!).toBeLessThan(
        photoStore.remove.mock.invocationCallOrder[0]!,
      );
    });

    it("replaces the stored photo with the new rendition and removes the old file after the write", async () => {
      // arrange
      const { useCase, recipes, photoStore } = createUseCase(PHOTOGRAPHED);

      // act
      const result = await useCase.execute({
        ownerAccountId: COACH_ACCOUNT_ID,
        recipeId: "recipe-1",
        draft: MILKY_OATS,
        photo: ATTACH,
      });

      // assert
      expect(result.status).toBe("edited");
      expect(photoStore.store).toHaveBeenCalledExactlyOnceWith(
        NEW_PHOTO_ID,
        RENDERED_PHOTO,
      );
      expect(writtenPhotoOf(recipes)).toEqual({ photoId: NEW_PHOTO_ID });
      expect(photoStore.remove).toHaveBeenCalledExactlyOnceWith(
        STORED_PHOTO_ID,
      );
    });

    it("refuses a photo the renderer cannot read, leaving the recipe and its photo as they were", async () => {
      // arrange
      const { useCase, recipes, renditions, photoStore } =
        createUseCase(PHOTOGRAPHED);
      renditions.render.mockResolvedValueOnce({ status: "refused" });

      // act
      const result = await useCase.execute({
        ownerAccountId: COACH_ACCOUNT_ID,
        recipeId: "recipe-1",
        draft: MILKY_OATS,
        photo: ATTACH,
      });

      // assert
      expect(result).toEqual({
        status: "invalid",
        problems: { photo: "unsupported" },
      });
      expect(photoStore.store).not.toHaveBeenCalled();
      expect(photoStore.remove).not.toHaveBeenCalled();
      expect(recipes.replace).not.toHaveBeenCalled();
    });

    it("removes the new photo but keeps the stored one when the library finds the name taken meanwhile", async () => {
      // arrange
      const { useCase, recipes, photoStore } = createUseCase(PHOTOGRAPHED);
      recipes.replace.mockResolvedValueOnce("name-taken");

      // act
      const result = await useCase.execute({
        ownerAccountId: COACH_ACCOUNT_ID,
        recipeId: "recipe-1",
        draft: MILKY_OATS,
        photo: ATTACH,
      });

      // assert
      expect(result).toEqual({
        status: "invalid",
        problems: { name: "taken" },
      });
      expect(photoStore.remove).toHaveBeenCalledExactlyOnceWith(NEW_PHOTO_ID);
    });

    it("removes the new photo but keeps the stored one when the write fails, answering that the edit failed", async () => {
      // arrange
      const failure = new Error("connection terminated");
      const { useCase, recipes, photoStore, incidents } =
        createUseCase(PHOTOGRAPHED);
      recipes.replace.mockRejectedValueOnce(failure);

      // act
      const result = await useCase.execute({
        ownerAccountId: COACH_ACCOUNT_ID,
        recipeId: "recipe-1",
        draft: MILKY_OATS,
        photo: ATTACH,
      });

      // assert
      expect(result).toEqual({ status: "failed" });
      expect(photoStore.remove).toHaveBeenCalledExactlyOnceWith(NEW_PHOTO_ID);
      expect(incidents.recipeEditFailed).toHaveBeenCalledWith({
        recipeId: "recipe-1",
        error: failure,
      });
    });

    it("answers that a stored photo it could not remove is an incident, never a refusal", async () => {
      // arrange
      const failure = new Error("disk unavailable");
      const { useCase, photoStore, incidents } = createUseCase(PHOTOGRAPHED);
      photoStore.remove.mockRejectedValueOnce(failure);

      // act
      const result = await useCase.execute({
        ownerAccountId: COACH_ACCOUNT_ID,
        recipeId: "recipe-1",
        draft: MILKY_OATS,
        photo: { kind: "remove" },
      });

      // assert
      expect(result.status).toBe("edited");
      expect(incidents.recipePhotoCleanupFailed).toHaveBeenCalledWith({
        photoId: STORED_PHOTO_ID,
        error: failure,
      });
    });
  });

  it("renders nothing for a recipe it cannot find", async () => {
    // arrange
    const { useCase, renditions, photoStore } = createUseCase();

    // act
    const result = await useCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      recipeId: "recipe-9",
      draft: MILKY_OATS,
      photo: ATTACH,
    });

    // assert
    expect(result).toEqual({ status: "not-found" });
    expect(renditions.render).not.toHaveBeenCalled();
    expect(photoStore.store).not.toHaveBeenCalled();
  });
});
