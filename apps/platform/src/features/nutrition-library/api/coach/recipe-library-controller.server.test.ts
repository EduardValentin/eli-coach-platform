import type { AccountSnapshot } from "@eli-coach-platform/domain/account";
import {
  Food,
  Recipe,
  type CreateRecipeResult,
  type CreateRecipeUseCase,
  type EditRecipeResult,
  type EditRecipeUseCase,
  type FindRecipeResult,
  type FindRecipeUseCase,
  type FoodSnapshot,
  type ListRecipesResult,
  type ListRecipesUseCase,
  type NutritionTag,
  type RecipeSnapshot,
  type StartRecipeResult,
  type StartRecipeUseCase,
} from "@eli-coach-platform/domain/nutrition";
import { describe, expect, it, vi } from "vitest";

import type { AccountsFeature } from "~/features/accounts/server/accounts-composition.server";
import { accountsContext } from "~/features/accounts/server/guards/accounts-context.server";
import {
  sessionContext,
  type ResolvedSession,
} from "~/features/accounts/server/guards/session-context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/server/test-support/request-args";

import { RecipeLibraryController } from "./recipe-library-controller.server";

const RECIPE_ID = "2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e";
const OATS_ID = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
const MILK_ID = "3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e6f";
const HONEY_ID = "4d5e6f7a-8b9c-4d0e-9f1a-2b3c4d5e6f7a";
const AT = new Date("2026-10-14T09:00:00.000Z");
const RECIPES = { redirectTo: "/coach/nutrition?tab=recipes" };

const COACH: AccountSnapshot = {
  authSubjectId: "user_eli",
  id: "acct_eli",
  role: "COACH",
};

const CLIENT_SESSION: ResolvedSession = {
  account: { authSubjectId: "user_ana", id: "acct_ana", role: "CLIENT" },
  kind: "authenticated",
};

const ANONYMOUS_SESSION: ResolvedSession = { kind: "anonymous" };

const TAGS: NutritionTag[] = [
  { id: "mt-breakfast", family: "meal-time", label: "Breakfast", order: 1 },
  { id: "di-vegetarian", family: "dietary", label: "Vegetarian", order: 15 },
];

const TAG_VIEWS = [
  { id: "mt-breakfast", family: "meal-time", label: "Breakfast" },
  { id: "di-vegetarian", family: "dietary", label: "Vegetarian" },
];

function foodSnapshot(
  id: string,
  name: string,
  values: Pick<FoodSnapshot, "kcal" | "protein" | "carb" | "fat">,
): FoodSnapshot {
  return {
    id,
    ownerAccountId: COACH.id,
    name,
    category: "carb",
    icon: "grain",
    ...values,
    defaultPortionGrams: 100,
    tagIds: [],
    archivedAt: null,
    createdAt: AT,
    updatedAt: AT,
  };
}

const OATS = Food.reconstitute(
  foodSnapshot(OATS_ID, "Oats", {
    kcal: 389,
    protein: 16.9,
    carb: 66.3,
    fat: 6.9,
  }),
);
const MILK = Food.reconstitute(
  foodSnapshot(MILK_ID, "Milk", { kcal: 42, protein: 3.4, carb: 5, fat: 1 }),
);
const HONEY = Food.reconstitute({
  ...foodSnapshot(HONEY_ID, "Honey", {
    kcal: 304,
    protein: 0.3,
    carb: 82.4,
    fat: 0,
  }),
  archivedAt: AT,
});

const FOOD_VIEW_OF = (food: Food) => {
  const {
    ownerAccountId: _ownerAccountId,
    archivedAt: _archivedAt,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    ...view
  } = food.toSnapshot();

  return view;
};

const PORRIDGE: RecipeSnapshot = {
  id: RECIPE_ID,
  ownerAccountId: COACH.id,
  name: "Porridge",
  ingredients: [
    { foodId: OATS_ID, grams: 40, method: "boiled" },
    { foodId: MILK_ID, grams: 250, method: "raw" },
  ],
  prepMinutes: 5,
  cookMinutes: 10,
  instructions: "Simmer the oats in the milk.",
  icon: "pot",
  mealRoleIds: ["mt-breakfast"],
  tagIds: ["di-vegetarian"],
  archivedAt: null,
  createdAt: AT,
  updatedAt: AT,
};

const PORRIDGE_VIEW = {
  id: RECIPE_ID,
  name: "Porridge",
  ingredients: [
    { foodId: OATS_ID, grams: 40, method: "boiled" },
    { foodId: MILK_ID, grams: 250, method: "raw" },
  ],
  prepMinutes: 5,
  cookMinutes: 10,
  instructions: "Simmer the oats in the milk.",
  icon: "pot",
  mealRoleIds: ["mt-breakfast"],
  tagIds: ["di-vegetarian"],
};

const PORRIDGE_REQUEST = {
  name: "Porridge",
  ingredients: PORRIDGE_VIEW.ingredients,
  prepMinutes: 5,
  cookMinutes: 10,
  instructions: "Simmer the oats in the milk.",
  icon: "pot",
  tagIds: ["mt-breakfast", "di-vegetarian"],
};

function createController() {
  const porridge = Recipe.reconstitute(PORRIDGE);
  const listRecipes = {
    execute: vi.fn(async (): Promise<ListRecipesResult> => ({
      status: "listed",
      recipes: [porridge],
      foods: [MILK, OATS],
      tags: TAGS,
    })),
  };
  const startRecipe = {
    execute: vi.fn(async (): Promise<StartRecipeResult> => ({
      status: "started",
      pickableFoods: Recipe.pickableFoodsForNew([MILK, OATS]),
      otherNames: ["Omelette"],
      tags: TAGS,
    })),
  };
  const findRecipe = {
    execute: vi.fn(async (): Promise<FindRecipeResult> => ({
      status: "found",
      recipe: porridge,
      pickableFoods: Recipe.reconstitute({
        ...PORRIDGE,
        ingredients: [
          ...PORRIDGE.ingredients,
          { foodId: HONEY_ID, grams: 10, method: "raw" },
        ],
      }).pickableFoods({
        activeFoods: [MILK, OATS],
        referencedFoods: [HONEY, MILK, OATS],
      }),
      otherNames: ["Omelette"],
      tags: TAGS,
    })),
  };
  const createRecipe = {
    execute: vi.fn(async (): Promise<CreateRecipeResult> => ({
      status: "created",
      recipe: porridge,
    })),
  };
  const editRecipe = {
    execute: vi.fn(async (): Promise<EditRecipeResult> => ({
      status: "edited",
      recipe: porridge,
    })),
  };
  const controller = new RecipeLibraryController({
    listRecipes: listRecipes as unknown as ListRecipesUseCase,
    startRecipe: startRecipe as unknown as StartRecipeUseCase,
    findRecipe: findRecipe as unknown as FindRecipeUseCase,
    createRecipe: createRecipe as unknown as CreateRecipeUseCase,
    editRecipe: editRecipe as unknown as EditRecipeUseCase,
  });

  return {
    controller,
    listRecipes,
    startRecipe,
    findRecipe,
    createRecipe,
    editRecipe,
  };
}

function argsFor(
  options: { session?: ResolvedSession; request?: Request } = {},
) {
  const accounts = {
    portal: {
      appBasePath: "/app",
      publicAppUrl: "https://evoa.fit",
      signInUrl: "https://accounts.evoa.fit/sign-in",
    },
  } as unknown as AccountsFeature;

  return createRequestArgs({
    contexts: [
      contextEntry(accountsContext, accounts),
      contextEntry(
        sessionContext,
        options.session ?? { account: COACH, kind: "authenticated" },
      ),
    ],
    request: options.request,
  });
}

function jsonRequest(method: "POST" | "PUT", body: unknown): Request {
  return new Request("https://evoa.fit/api/coach/recipes", {
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method,
  });
}

async function captureThrown(thunk: () => unknown): Promise<unknown> {
  try {
    await thunk();
    return undefined;
  } catch (thrown) {
    return thrown;
  }
}

describe("RecipeLibraryController#list", () => {
  it("presents every recipe of the signed-in coach as a card with its total minutes, the macros its foods give and its meal roles before its tags", async () => {
    // arrange
    const { controller, listRecipes } = createController();

    // act
    const library = await controller.list(argsFor());

    // assert
    expect(library).toEqual({
      recipes: [
        {
          id: RECIPE_ID,
          name: "Porridge",
          icon: "pot",
          totalMinutes: 15,
          macros: { kcal: 261, protein: 15, carb: 39, fat: 5 },
          tagIds: ["mt-breakfast", "di-vegetarian"],
        },
      ],
    });
    expect(listRecipes.execute).toHaveBeenCalledWith(COACH.id);
  });

  it("refuses a signed-in client", async () => {
    // arrange
    const { controller } = createController();

    // act
    const thrown = await captureThrown(() =>
      controller.list(argsFor({ session: CLIENT_SESSION })),
    );

    // assert
    expect((thrown as Response).status).toBe(403);
  });
});

describe("RecipeLibraryController#loadNew", () => {
  it("opens a blank recipe offering her active foods, with the names of her recipes and the tag vocabulary", async () => {
    // arrange
    const { controller, startRecipe } = createController();

    // act
    const builder = await controller.loadNew(argsFor());

    // assert
    expect(builder).toEqual({
      recipe: null,
      offeredFoods: [FOOD_VIEW_OF(MILK), FOOD_VIEW_OF(OATS)],
      placedFoods: [],
      otherNames: ["Omelette"],
      tags: TAG_VIEWS,
    });
    expect(startRecipe.execute).toHaveBeenCalledWith(COACH.id);
  });

  it("refuses a signed-in client", async () => {
    // arrange
    const { controller } = createController();

    // act
    const thrown = await captureThrown(() =>
      controller.loadNew(argsFor({ session: CLIENT_SESSION })),
    );

    // assert
    expect((thrown as Response).status).toBe(403);
  });
});

describe("RecipeLibraryController#load", () => {
  it("presents her recipe with the foods it may use, the archived ones it already uses apart, the names of her other recipes and the tag vocabulary", async () => {
    // arrange
    const { controller, findRecipe } = createController();

    // act
    const builder = await controller.load(argsFor(), RECIPE_ID);

    // assert
    expect(builder).toEqual({
      recipe: PORRIDGE_VIEW,
      offeredFoods: [FOOD_VIEW_OF(MILK), FOOD_VIEW_OF(OATS)],
      placedFoods: [FOOD_VIEW_OF(HONEY)],
      otherNames: ["Omelette"],
      tags: TAG_VIEWS,
    });
    expect(findRecipe.execute).toHaveBeenCalledWith({
      ownerAccountId: COACH.id,
      recipeId: RECIPE_ID,
    });
  });

  it.each([
    ["an unknown recipe", RECIPE_ID],
    ["an id that is not a uuid", "not-a-recipe"],
  ])("sends the coach back to the Recipes tab for %s", async (_case, id) => {
    // arrange
    const { controller, findRecipe } = createController();
    findRecipe.execute.mockResolvedValueOnce({ status: "not-found" });

    // act
    const thrown = await captureThrown(() => controller.load(argsFor(), id));

    // assert
    expect((thrown as Response).status).toBe(302);
    expect((thrown as Response).headers.get("Location")).toBe(
      "/coach/nutrition?tab=recipes",
    );
  });

  it("refuses a signed-in client", async () => {
    // arrange
    const { controller, findRecipe } = createController();

    // act
    const thrown = await captureThrown(() =>
      controller.load(argsFor({ session: CLIENT_SESSION }), RECIPE_ID),
    );

    // assert
    expect((thrown as Response).status).toBe(403);
    expect(findRecipe.execute).not.toHaveBeenCalled();
  });
});

describe("RecipeLibraryController#create", () => {
  it("creates the recipe for the signed-in coach and names the Recipes tab as the next page", async () => {
    // arrange
    const { controller, createRecipe } = createController();

    // act
    const response = await controller.create(
      argsFor({ request: jsonRequest("POST", PORRIDGE_REQUEST) }),
    );

    // assert
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(RECIPES);
    expect(createRecipe.execute).toHaveBeenCalledWith({
      ownerAccountId: COACH.id,
      draft: PORRIDGE_REQUEST,
    });
  });

  it("creates a recipe without an icon or ingredients", async () => {
    // arrange
    const { controller, createRecipe } = createController();
    const bare = { ...PORRIDGE_REQUEST, icon: null, ingredients: [] };

    // act
    const response = await controller.create(
      argsFor({ request: jsonRequest("POST", bare) }),
    );

    // assert
    expect(response.status).toBe(200);
    expect(createRecipe.execute).toHaveBeenCalledWith({
      ownerAccountId: COACH.id,
      draft: bare,
    });
  });

  it("answers 422 with the problems of a draft that breaks a rule, each ingredient's at its position", async () => {
    // arrange
    const { controller, createRecipe } = createController();
    const problems = {
      name: "taken" as const,
      ingredients: [{ position: 1, problem: "unknown-food" as const }],
      cookMinutes: "out-of-range" as const,
    };
    createRecipe.execute.mockResolvedValueOnce({ status: "invalid", problems });

    // act
    const response = await controller.create(
      argsFor({ request: jsonRequest("POST", PORRIDGE_REQUEST) }),
    );

    // assert
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ problems });
  });

  it.each([
    ["a body that is not JSON", "{"],
    ["a body missing a field", { ...PORRIDGE_REQUEST, cookMinutes: undefined }],
    ["minutes given as text", { ...PORRIDGE_REQUEST, prepMinutes: "5" }],
    [
      "grams given as text",
      {
        ...PORRIDGE_REQUEST,
        ingredients: [{ foodId: OATS_ID, grams: "40", method: "raw" }],
      },
    ],
    [
      "an ingredient without a method",
      { ...PORRIDGE_REQUEST, ingredients: [{ foodId: OATS_ID, grams: 40 }] },
    ],
    ["an icon that is not text", { ...PORRIDGE_REQUEST, icon: 3 }],
    [
      "a body larger than 64 KiB",
      { ...PORRIDGE_REQUEST, instructions: "i".repeat(65 * 1024) },
    ],
  ])("answers 400 to %s without creating", async (_case, body) => {
    // arrange
    const { controller, createRecipe } = createController();

    // act
    const response = await controller.create(
      argsFor({ request: jsonRequest("POST", body) }),
    );

    // assert
    expect(response.status).toBe(400);
    expect(createRecipe.execute).not.toHaveBeenCalled();
  });

  it("reads a body of 60 KiB", async () => {
    // arrange
    const { controller, createRecipe } = createController();
    const long = { ...PORRIDGE_REQUEST, instructions: "i".repeat(60 * 1024) };

    // act
    const response = await controller.create(
      argsFor({ request: jsonRequest("POST", long) }),
    );

    // assert
    expect(response.status).toBe(200);
    expect(createRecipe.execute).toHaveBeenCalledOnce();
  });

  it("answers 500 when the creation failed", async () => {
    // arrange
    const { controller, createRecipe } = createController();
    createRecipe.execute.mockResolvedValueOnce({ status: "failed" });

    // act
    const response = await controller.create(
      argsFor({ request: jsonRequest("POST", PORRIDGE_REQUEST) }),
    );

    // assert
    expect(response.status).toBe(500);
  });

  it.each([
    ["a signed-in client", CLIENT_SESSION, 403],
    ["a signed-out visitor", ANONYMOUS_SESSION, 401],
  ])("refuses %s", async (_case, session, status) => {
    // arrange
    const { controller, createRecipe } = createController();

    // act
    const thrown = await captureThrown(() =>
      controller.create(
        argsFor({ session, request: jsonRequest("POST", PORRIDGE_REQUEST) }),
      ),
    );

    // assert
    expect((thrown as Response).status).toBe(status);
    expect(createRecipe.execute).not.toHaveBeenCalled();
  });
});

describe("RecipeLibraryController#edit", () => {
  it("edits the signed-in coach's recipe and names the Recipes tab as the next page", async () => {
    // arrange
    const { controller, editRecipe } = createController();

    // act
    const response = await controller.edit(
      argsFor({ request: jsonRequest("PUT", PORRIDGE_REQUEST) }),
      RECIPE_ID,
    );

    // assert
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(RECIPES);
    expect(editRecipe.execute).toHaveBeenCalledWith({
      ownerAccountId: COACH.id,
      recipeId: RECIPE_ID,
      draft: PORRIDGE_REQUEST,
    });
  });

  it("answers 422 with the problems of a draft that breaks a rule", async () => {
    // arrange
    const { controller, editRecipe } = createController();
    editRecipe.execute.mockResolvedValueOnce({
      status: "invalid",
      problems: { instructions: "too-long" },
    });

    // act
    const response = await controller.edit(
      argsFor({ request: jsonRequest("PUT", PORRIDGE_REQUEST) }),
      RECIPE_ID,
    );

    // assert
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      problems: { instructions: "too-long" },
    });
  });

  it("answers 404 for an unknown recipe", async () => {
    // arrange
    const { controller, editRecipe } = createController();
    editRecipe.execute.mockResolvedValueOnce({ status: "not-found" });

    // act
    const response = await controller.edit(
      argsFor({ request: jsonRequest("PUT", PORRIDGE_REQUEST) }),
      RECIPE_ID,
    );

    // assert
    expect(response.status).toBe(404);
  });

  it("answers 404 for an id that is not a uuid without editing", async () => {
    // arrange
    const { controller, editRecipe } = createController();

    // act
    const response = await controller.edit(
      argsFor({ request: jsonRequest("PUT", PORRIDGE_REQUEST) }),
      "not-a-recipe",
    );

    // assert
    expect(response.status).toBe(404);
    expect(editRecipe.execute).not.toHaveBeenCalled();
  });

  it("answers 400 to a malformed body without editing", async () => {
    // arrange
    const { controller, editRecipe } = createController();

    // act
    const response = await controller.edit(
      argsFor({ request: jsonRequest("PUT", { name: "Porridge" }) }),
      RECIPE_ID,
    );

    // assert
    expect(response.status).toBe(400);
    expect(editRecipe.execute).not.toHaveBeenCalled();
  });

  it("answers 500 when the edit failed", async () => {
    // arrange
    const { controller, editRecipe } = createController();
    editRecipe.execute.mockResolvedValueOnce({ status: "failed" });

    // act
    const response = await controller.edit(
      argsFor({ request: jsonRequest("PUT", PORRIDGE_REQUEST) }),
      RECIPE_ID,
    );

    // assert
    expect(response.status).toBe(500);
  });

  it.each([
    ["a signed-in client", CLIENT_SESSION, 403],
    ["a signed-out visitor", ANONYMOUS_SESSION, 401],
  ])("refuses %s", async (_case, session, status) => {
    // arrange
    const { controller, editRecipe } = createController();

    // act
    const thrown = await captureThrown(() =>
      controller.edit(
        argsFor({ session, request: jsonRequest("PUT", PORRIDGE_REQUEST) }),
        RECIPE_ID,
      ),
    );

    // assert
    expect((thrown as Response).status).toBe(status);
    expect(editRecipe.execute).not.toHaveBeenCalled();
  });
});
