import type { AccountSnapshot } from "@eli-coach-platform/domain/account";
import {
  Food,
  MAX_RECIPE_PHOTO_BYTES,
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
  type OpenRecipePhotoResult,
  type OpenRecipePhotoUseCase,
  type RecipeSnapshot,
  type StartRecipeResult,
  type StartRecipeUseCase,
} from "@eli-coach-platform/domain/nutrition";
import { describe, expect, it, vi } from "vitest";

import type { AccountsFeature } from "~/bounded-contexts/access/accounts/server/accounts-composition.server";
import { accountsContext } from "~/bounded-contexts/access/accounts/server/guards/accounts-context.server";
import {
  sessionContext,
  type ResolvedSession,
} from "~/bounded-contexts/access/accounts/server/guards/session-context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/composition-root/test-support/request-args";

import { RecipeLibraryController } from "./recipe-library-controller.server";

const RECIPE_ID = "2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e";
const PHOTO_ID = "5e6f7a8b-9c0d-4e1f-8a2b-3c4d5e6f7a8b";
const PHOTO_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
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
  photo: null,
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
  photo: null,
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

const KEEP = { kind: "keep" } as const;

const OPENED: OpenRecipePhotoResult = {
  status: "opened",
  mediaType: "image/webp",
  bytes: {
    async *[Symbol.asyncIterator]() {
      yield new Uint8Array([1, 2, 3]);
    },
  },
  sizeBytes: 3,
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
  const openRecipePhoto = {
    execute: vi.fn(async (): Promise<OpenRecipePhotoResult> => OPENED),
  };
  const controller = new RecipeLibraryController({
    listRecipes: listRecipes as unknown as ListRecipesUseCase,
    startRecipe: startRecipe as unknown as StartRecipeUseCase,
    findRecipe: findRecipe as unknown as FindRecipeUseCase,
    createRecipe: createRecipe as unknown as CreateRecipeUseCase,
    editRecipe: editRecipe as unknown as EditRecipeUseCase,
    openRecipePhoto: openRecipePhoto as unknown as OpenRecipePhotoUseCase,
  });

  return {
    controller,
    listRecipes,
    startRecipe,
    findRecipe,
    createRecipe,
    editRecipe,
    openRecipePhoto,
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

function multipartRequest(
  method: "POST" | "PUT",
  parts: { recipe?: unknown; photo?: Uint8Array<ArrayBuffer> | string },
): Request {
  const form = new FormData();

  if (parts.recipe !== undefined) {
    form.set(
      "recipe",
      typeof parts.recipe === "string"
        ? parts.recipe
        : JSON.stringify(parts.recipe),
    );
  }

  if (typeof parts.photo === "string") {
    form.set("photo", parts.photo);
  } else if (parts.photo) {
    form.set(
      "photo",
      new File([parts.photo], "porridge.jpg", { type: "image/jpeg" }),
    );
  }

  return new Request("https://evoa.fit/api/coach/recipes", {
    body: form,
    method,
  });
}

function photoRequest(): Request {
  return new Request(
    `https://evoa.fit/api/recipes/${RECIPE_ID}/photo/${PHOTO_ID}`,
  );
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
          photo: null,
          totalMinutes: 15,
          macros: { kcal: 261, protein: 15, carb: 39, fat: 5 },
          tagIds: ["mt-breakfast", "di-vegetarian"],
        },
      ],
    });
    expect(listRecipes.execute).toHaveBeenCalledWith(COACH.id);
  });

  it("names the address of a recipe's stored photo on its card, never the stored file itself", async () => {
    // arrange
    const { controller, listRecipes } = createController();
    listRecipes.execute.mockResolvedValueOnce({
      status: "listed",
      recipes: [
        Recipe.reconstitute({ ...PORRIDGE, photo: { photoId: PHOTO_ID } }),
      ],
      foods: [MILK, OATS],
      tags: TAGS,
    });

    // act
    const library = await controller.list(argsFor());

    // assert
    expect(library.recipes[0]?.photo).toEqual({
      path: `/api/recipes/${RECIPE_ID}/photo/${PHOTO_ID}`,
    });
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
      photo: KEEP,
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
      photo: KEEP,
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
      photo: KEEP,
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

describe("RecipeLibraryController saving a photo", () => {
  it.each([
    ["keep", { kind: "keep" }],
    ["remove", { kind: "remove" }],
  ] as const)(
    "hands the use case a %s choice read from a JSON body",
    async (photo, choice) => {
      // arrange
      const { controller, createRecipe } = createController();

      // act
      const response = await controller.create(
        argsFor({
          request: jsonRequest("POST", { ...PORRIDGE_REQUEST, photo }),
        }),
      );

      // assert
      expect(response.status).toBe(200);
      expect(createRecipe.execute).toHaveBeenCalledWith({
        ownerAccountId: COACH.id,
        draft: PORRIDGE_REQUEST,
        photo: choice,
      });
    },
  );

  it("answers 400 to a JSON body attaching a photo it does not carry", async () => {
    // arrange
    const { controller, createRecipe } = createController();

    // act
    const response = await controller.create(
      argsFor({
        request: jsonRequest("POST", { ...PORRIDGE_REQUEST, photo: "attach" }),
      }),
    );

    // assert
    expect(response.status).toBe(400);
    expect(createRecipe.execute).not.toHaveBeenCalled();
  });

  it("reads the recipe part and the photo's bytes from a multipart body and creates the recipe with them", async () => {
    // arrange
    const { controller, createRecipe } = createController();

    // act
    const response = await controller.create(
      argsFor({
        request: multipartRequest("POST", {
          recipe: { ...PORRIDGE_REQUEST, photo: "attach" },
          photo: PHOTO_BYTES,
        }),
      }),
    );

    // assert
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(RECIPES);
    expect(createRecipe.execute).toHaveBeenCalledWith({
      ownerAccountId: COACH.id,
      draft: PORRIDGE_REQUEST,
      photo: { kind: "attach", bytes: PHOTO_BYTES },
    });
  });

  it("edits the recipe with the photo read from a multipart body", async () => {
    // arrange
    const { controller, editRecipe } = createController();

    // act
    const response = await controller.edit(
      argsFor({
        request: multipartRequest("PUT", {
          recipe: { ...PORRIDGE_REQUEST, photo: "attach" },
          photo: PHOTO_BYTES,
        }),
      }),
      RECIPE_ID,
    );

    // assert
    expect(response.status).toBe(200);
    expect(editRecipe.execute).toHaveBeenCalledWith({
      ownerAccountId: COACH.id,
      recipeId: RECIPE_ID,
      draft: PORRIDGE_REQUEST,
      photo: { kind: "attach", bytes: PHOTO_BYTES },
    });
  });

  it.each<
    [string, { recipe?: unknown; photo?: Uint8Array<ArrayBuffer> | string }]
  >([
    [
      "attaching a photo without a photo file",
      { recipe: { ...PORRIDGE_REQUEST, photo: "attach" } },
    ],
    [
      "attaching a photo given as text",
      { recipe: { ...PORRIDGE_REQUEST, photo: "attach" }, photo: "porridge" },
    ],
    [
      "a photo file while keeping the photo",
      { recipe: { ...PORRIDGE_REQUEST, photo: "keep" }, photo: PHOTO_BYTES },
    ],
    ["no recipe part", { photo: PHOTO_BYTES }],
    ["a recipe part that is not JSON", { recipe: "{", photo: PHOTO_BYTES }],
    [
      "a recipe part missing a field",
      {
        recipe: { ...PORRIDGE_REQUEST, name: undefined, photo: "attach" },
        photo: PHOTO_BYTES,
      },
    ],
    [
      "a recipe part larger than 64 KiB",
      {
        recipe: {
          ...PORRIDGE_REQUEST,
          instructions: "i".repeat(65 * 1024),
          photo: "attach",
        },
        photo: PHOTO_BYTES,
      },
    ],
  ])(
    "answers 400 to a multipart body with %s without saving",
    async (_case, parts) => {
      // arrange
      const { controller, createRecipe } = createController();

      // act
      const response = await controller.create(
        argsFor({ request: multipartRequest("POST", parts) }),
      );

      // assert
      expect(response.status).toBe(400);
      expect(createRecipe.execute).not.toHaveBeenCalled();
    },
  );

  it("answers 400 to a multipart body it cannot parse", async () => {
    // arrange
    const { controller, createRecipe } = createController();
    const broken = new Request("https://evoa.fit/api/coach/recipes", {
      body: "not multipart at all",
      headers: { "Content-Type": "multipart/form-data; boundary=missing" },
      method: "POST",
    });

    // act
    const response = await controller.create(argsFor({ request: broken }));

    // assert
    expect(response.status).toBe(400);
    expect(createRecipe.execute).not.toHaveBeenCalled();
  });

  it("answers 413 naming the photo too large to a body beyond 10 MB and its 1 MB allowance, without saving", async () => {
    // arrange
    const { controller, createRecipe } = createController();
    const oversized = multipartRequest("POST", {
      recipe: { ...PORRIDGE_REQUEST, photo: "attach" },
      photo: new Uint8Array(MAX_RECIPE_PHOTO_BYTES + 1024 * 1024 + 1),
    });
    const request = new Request(oversized.url, {
      body: await oversized.arrayBuffer(),
      headers: { "Content-Type": oversized.headers.get("Content-Type") ?? "" },
      method: "POST",
    });

    // act
    const response = await controller.create(argsFor({ request }));

    // assert
    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({
      problems: { photo: "too-large" },
    });
    expect(createRecipe.execute).not.toHaveBeenCalled();
  });

  it("answers 422 with the photo's refusal beside the draft's problems", async () => {
    // arrange
    const { controller, createRecipe } = createController();
    const problems = { name: "taken" as const, photo: "unsupported" as const };
    createRecipe.execute.mockResolvedValueOnce({ status: "invalid", problems });

    // act
    const response = await controller.create(
      argsFor({
        request: multipartRequest("POST", {
          recipe: { ...PORRIDGE_REQUEST, photo: "attach" },
          photo: PHOTO_BYTES,
        }),
      }),
    );

    // assert
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ problems });
  });
});

describe("RecipeLibraryController#openPhoto", () => {
  it("serves the coach the whole stored photo, privately cached for good", async () => {
    // arrange
    const { controller, openRecipePhoto } = createController();

    // act
    const response = await controller.openPhoto(
      argsFor({ request: photoRequest() }),
      { recipeId: RECIPE_ID, photoId: PHOTO_ID },
    );

    // assert
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/webp");
    expect(response.headers.get("Content-Length")).toBe("3");
    expect(response.headers.get("Cache-Control")).toBe(
      "private, max-age=31536000, immutable",
    );
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(
      new Uint8Array([1, 2, 3]),
    );
    expect(openRecipePhoto.execute).toHaveBeenCalledWith({
      viewer: { kind: "coach", accountId: COACH.id },
      recipeId: RECIPE_ID,
      photoId: PHOTO_ID,
    });
  });

  it.each<[string, ResolvedSession, unknown]>([
    [
      "a signed-in client",
      CLIENT_SESSION,
      { kind: "client", authSubjectId: "user_ana" },
    ],
    ["a signed-out visitor", ANONYMOUS_SESSION, { kind: "visitor" }],
  ])(
    "asks the access rule on behalf of %s and answers 404 when it refuses",
    async (_case, session, viewer) => {
      // arrange
      const { controller, openRecipePhoto } = createController();
      openRecipePhoto.execute.mockResolvedValueOnce({ status: "not-found" });

      // act
      const response = await controller.openPhoto(
        argsFor({ session, request: photoRequest() }),
        { recipeId: RECIPE_ID, photoId: PHOTO_ID },
      );

      // assert
      expect(response.status).toBe(404);
      expect(openRecipePhoto.execute).toHaveBeenCalledWith(
        expect.objectContaining({ viewer }),
      );
    },
  );

  it.each([
    ["a recipe id", { recipeId: "not-an-id", photoId: PHOTO_ID }],
    ["a photo id", { recipeId: RECIPE_ID, photoId: "not-an-id" }],
  ])(
    "answers 404 to %s that is not a uuid without opening anything",
    async (_case, address) => {
      // arrange
      const { controller, openRecipePhoto } = createController();

      // act
      const response = await controller.openPhoto(
        argsFor({ request: photoRequest() }),
        address,
      );

      // assert
      expect(response.status).toBe(404);
      expect(openRecipePhoto.execute).not.toHaveBeenCalled();
    },
  );
});
