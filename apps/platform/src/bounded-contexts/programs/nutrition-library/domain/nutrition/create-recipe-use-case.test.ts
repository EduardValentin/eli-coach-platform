import { describe, expect, it, vi } from "vitest";

import { CreateRecipeUseCase } from "./create-recipe-use-case";
import { Food } from "./food";
import type { NutritionLibraryIncidentsPort } from "./nutrition-library-incidents-port";
import type { NutritionTag } from "./nutrition-tags-port";
import { Recipe } from "./recipe";
import type { RecipeDraftInput } from "./recipe-draft";
import type { RecipeAddition } from "./recipe-library-port";
import { MAX_RECIPE_PHOTO_BYTES, type RecipePhotoChoice } from "./recipe-photo";
import type { RecipePhotoRendition } from "./recipe-photo-renditions-port";
import { RecipePhotoSaving } from "./recipe-photo-saving";

const STORED_AT = new Date("2026-10-13T09:00:00.000Z");
const NOW = new Date("2026-10-14T09:00:00.000Z");
const COACH_ACCOUNT_ID = "coach-account-1";
const OTHER_COACH_ACCOUNT_ID = "coach-account-2";
const PHOTO_ID = "7a1b0000-0000-4000-8000-000000000001";
const RECEIVED_PHOTO = new Uint8Array([0xff, 0xd8, 0xff]);
const RENDERED_PHOTO = new Uint8Array([0x52, 0x49, 0x46, 0x46]);
const KEEP: RecipePhotoChoice = { kind: "keep" };
const ATTACH: RecipePhotoChoice = { kind: "attach", bytes: RECEIVED_PHOTO };

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
    photo: null,
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
    add: vi.fn(async (_recipe: Recipe): Promise<RecipeAddition> => "added"),
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
  const createRecipeUseCase = new CreateRecipeUseCase({
    recipeLibraryPort: recipes,
    foodLibraryPort: foods,
    nutritionTagsPort: tags,
    recipeIdsPort: { generate: () => "recipe-3" },
    clockPort: { now: () => NOW },
    nutritionLibraryIncidentsPort: incidents,
    photos: new RecipePhotoSaving({
      recipePhotoRenditionsPort: renditions,
      recipePhotoIdsPort: { generate: () => PHOTO_ID },
      recipePhotoStorePort: photoStore,
      nutritionLibraryIncidentsPort: incidents,
    }),
  });

  return {
    createRecipeUseCase,
    recipes,
    foods,
    tags,
    incidents,
    renditions,
    photoStore,
  };
}

describe("CreateRecipeUseCase", () => {
  it("adds the recipe under a new id, owned by the coach who created it, its name trimmed and its meal roles apart from its tags, created now", async () => {
    // arrange
    const { createRecipeUseCase, recipes } = createUseCase();

    // act
    const result = await createRecipeUseCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      photo: KEEP,
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
      photo: null,
      archivedAt: null,
      createdAt: NOW,
      updatedAt: NOW,
    });
    expect(result).toEqual({ status: "created", recipe: created });
    expect(recipes.add).toHaveBeenCalledWith(created);
  });

  it("adds a recipe with no ingredients", async () => {
    // arrange
    const { createRecipeUseCase, recipes } = createUseCase();

    // act
    const result = await createRecipeUseCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      photo: KEEP,
      draft: { ...PORRIDGE, ingredients: [] },
    });

    // assert
    expect(result.status).toBe("created");
    expect(recipes.add).toHaveBeenCalledOnce();
  });

  it("refuses a draft that breaks a rule, naming each problem, without adding it", async () => {
    // arrange
    const { createRecipeUseCase, recipes } = createUseCase();

    // act
    const result = await createRecipeUseCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      photo: KEEP,
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
      const { createRecipeUseCase, recipes } = createUseCase();

      // act
      const result = await createRecipeUseCase.execute({
        ownerAccountId: COACH_ACCOUNT_ID,
        photo: KEEP,
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
    const { createRecipeUseCase, recipes } = createUseCase();

    // act
    const result = await createRecipeUseCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      photo: KEEP,
      draft: { ...PORRIDGE, name: " OMELETTE  " },
    });

    // assert
    expect(result).toEqual({ status: "invalid", problems: { name: "taken" } });
    expect(recipes.add).not.toHaveBeenCalled();
  });

  it("adds a name only another coach's recipe has", async () => {
    // arrange
    const { createRecipeUseCase, recipes } = createUseCase();

    // act
    const result = await createRecipeUseCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      photo: KEEP,
      draft: { ...PORRIDGE, name: "pancakes" },
    });

    // assert
    expect(result.status).toBe("created");
    expect(recipes.add).toHaveBeenCalledOnce();
  });

  it("refuses the name when the library finds it taken by a recipe added meanwhile", async () => {
    // arrange
    const { createRecipeUseCase, recipes } = createUseCase();
    recipes.add.mockResolvedValueOnce("name-taken");

    // act
    const result = await createRecipeUseCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      photo: KEEP,
      draft: PORRIDGE,
    });

    // assert
    expect(result).toEqual({ status: "invalid", problems: { name: "taken" } });
  });

  it("reports a failed read of her foods and answers that the creation failed without adding it", async () => {
    // arrange
    const failure = new Error("connection terminated");
    const { createRecipeUseCase, recipes, foods, incidents } = createUseCase();
    foods.list.mockRejectedValueOnce(failure);

    // act
    const result = await createRecipeUseCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      photo: KEEP,
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
    const { createRecipeUseCase, recipes, incidents } = createUseCase();
    recipes.add.mockRejectedValueOnce(failure);

    // act
    const result = await createRecipeUseCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      photo: KEEP,
      draft: PORRIDGE,
    });

    // assert
    expect(result).toEqual({ status: "failed" });
    expect(incidents.recipeCreationFailed).toHaveBeenCalledWith({
      error: failure,
    });
  });

  it("stores the rendition of the photo she attached under a new photo id and adds the recipe holding it", async () => {
    // arrange
    const { createRecipeUseCase, recipes, renditions, photoStore } =
      createUseCase();

    // act
    const result = await createRecipeUseCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      draft: PORRIDGE,
      photo: ATTACH,
    });

    // assert
    expect(result.status).toBe("created");
    expect(renditions.render).toHaveBeenCalledExactlyOnceWith(RECEIVED_PHOTO);
    expect(photoStore.store).toHaveBeenCalledExactlyOnceWith(
      PHOTO_ID,
      RENDERED_PHOTO,
    );
    expect(recipes.add.mock.calls[0]?.[0].toSnapshot().photo).toEqual({
      photoId: PHOTO_ID,
    });
    expect(photoStore.remove).not.toHaveBeenCalled();
  });

  it.each<RecipePhotoChoice>([{ kind: "keep" }, { kind: "remove" }])(
    "adds a recipe without a photo for a $kind choice, rendering and storing nothing",
    async (photo) => {
      // arrange
      const { createRecipeUseCase, recipes, renditions, photoStore } =
        createUseCase();

      // act
      const result = await createRecipeUseCase.execute({
        ownerAccountId: COACH_ACCOUNT_ID,
        draft: PORRIDGE,
        photo,
      });

      // assert
      expect(result.status).toBe("created");
      expect(recipes.add.mock.calls[0]?.[0].photo).toBeNull();
      expect(renditions.render).not.toHaveBeenCalled();
      expect(photoStore.store).not.toHaveBeenCalled();
    },
  );

  it("refuses a photo the renderer cannot read, storing nothing and adding nothing", async () => {
    // arrange
    const { createRecipeUseCase, recipes, renditions, photoStore } =
      createUseCase();
    renditions.render.mockResolvedValueOnce({ status: "refused" });

    // act
    const result = await createRecipeUseCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      draft: PORRIDGE,
      photo: ATTACH,
    });

    // assert
    expect(result).toEqual({
      status: "invalid",
      problems: { photo: "unsupported" },
    });
    expect(photoStore.store).not.toHaveBeenCalled();
    expect(recipes.add).not.toHaveBeenCalled();
  });

  it("names a photo over 10 MB beside the draft's own problems, storing nothing", async () => {
    // arrange
    const { createRecipeUseCase, recipes, photoStore } = createUseCase();

    // act
    const result = await createRecipeUseCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      draft: { ...PORRIDGE, name: " " },
      photo: {
        kind: "attach",
        bytes: new Uint8Array(MAX_RECIPE_PHOTO_BYTES + 1),
      },
    });

    // assert
    expect(result).toEqual({
      status: "invalid",
      problems: { name: "missing", photo: "too-large" },
    });
    expect(photoStore.store).not.toHaveBeenCalled();
    expect(recipes.add).not.toHaveBeenCalled();
  });

  it("removes the stored photo when the library finds the name taken meanwhile", async () => {
    // arrange
    const { createRecipeUseCase, recipes, photoStore } = createUseCase();
    recipes.add.mockResolvedValueOnce("name-taken");

    // act
    const result = await createRecipeUseCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      draft: PORRIDGE,
      photo: ATTACH,
    });

    // assert
    expect(result).toEqual({ status: "invalid", problems: { name: "taken" } });
    expect(photoStore.remove).toHaveBeenCalledExactlyOnceWith(PHOTO_ID);
  });

  it("removes the stored photo when the write fails and answers that the creation failed", async () => {
    // arrange
    const failure = new Error("connection terminated");
    const { createRecipeUseCase, recipes, photoStore, incidents } =
      createUseCase();
    recipes.add.mockRejectedValueOnce(failure);

    // act
    const result = await createRecipeUseCase.execute({
      ownerAccountId: COACH_ACCOUNT_ID,
      draft: PORRIDGE,
      photo: ATTACH,
    });

    // assert
    expect(result).toEqual({ status: "failed" });
    expect(photoStore.remove).toHaveBeenCalledExactlyOnceWith(PHOTO_ID);
    expect(incidents.recipeCreationFailed).toHaveBeenCalledWith({
      error: failure,
    });
  });
});
