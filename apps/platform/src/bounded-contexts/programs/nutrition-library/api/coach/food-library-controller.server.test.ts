import type { AccountSnapshot } from "~/bounded-contexts/access/accounts/domain/account";
import {
  Food,
  type CreateFoodResult,
  type CreateFoodUseCase,
  type EditFoodResult,
  type EditFoodUseCase,
  type FindFoodResult,
  type FindFoodUseCase,
  type FoodSnapshot,
  type ListFoodsUseCase,
  type NutritionTag,
} from "~/bounded-contexts/programs/nutrition-library/domain/nutrition";
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

import { FoodLibraryController } from "./food-library-controller.server";

const FOOD_ID = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
const AT = new Date("2026-10-14T09:00:00.000Z");

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

const OATS: FoodSnapshot = {
  id: FOOD_ID,
  ownerAccountId: COACH.id,
  name: "Oats",
  category: "carb",
  icon: "grain",
  kcal: 389,
  protein: 16.9,
  carb: 66.3,
  fat: 6.9,
  defaultPortionGrams: 40,
  tagIds: ["mt-breakfast", "di-vegetarian"],
  archivedAt: null,
  createdAt: AT,
  updatedAt: AT,
};

const OATS_VIEW = {
  id: FOOD_ID,
  name: "Oats",
  category: "carb",
  icon: "grain",
  kcal: 389,
  protein: 16.9,
  carb: 66.3,
  fat: 6.9,
  defaultPortionGrams: 40,
  tagIds: ["mt-breakfast", "di-vegetarian"],
};

const { id: _id, ...OATS_REQUEST } = OATS_VIEW;

function createController() {
  const listFoods = {
    execute: vi.fn(async () => ({
      status: "listed" as const,
      foods: [Food.reconstitute(OATS)],
      tags: TAGS,
    })),
  };
  const findFood = {
    execute: vi.fn(async (): Promise<FindFoodResult> => ({
      status: "found",
      food: Food.reconstitute(OATS),
      otherNames: ["Rice"],
      tags: TAGS,
    })),
  };
  const createFood = {
    execute: vi.fn(async (): Promise<CreateFoodResult> => ({
      status: "created",
      food: Food.reconstitute(OATS),
    })),
  };
  const editFood = {
    execute: vi.fn(async (): Promise<EditFoodResult> => ({
      status: "edited",
      food: Food.reconstitute(OATS),
    })),
  };
  const controller = new FoodLibraryController({
    listFoods: listFoods as unknown as ListFoodsUseCase,
    findFood: findFood as unknown as FindFoodUseCase,
    createFood: createFood as unknown as CreateFoodUseCase,
    editFood: editFood as unknown as EditFoodUseCase,
  });

  return { controller, listFoods, findFood, createFood, editFood };
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
  return new Request("https://evoa.fit/api/coach/foods", {
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

describe("FoodLibraryController#list", () => {
  it("presents every food the signed-in coach's library lists with the tag vocabulary", async () => {
    // arrange
    const { controller, listFoods } = createController();

    // act
    const library = await controller.list(argsFor());

    // assert
    expect(library).toEqual({ foods: [OATS_VIEW], tags: TAG_VIEWS });
    expect(listFoods.execute).toHaveBeenCalledWith(COACH.id);
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

describe("FoodLibraryController#loadNew", () => {
  it("opens a blank food with the names of every food in the signed-in coach's library and the tag vocabulary", async () => {
    // arrange
    const { controller, listFoods } = createController();

    // act
    const editor = await controller.loadNew(argsFor());

    // assert
    expect(editor).toEqual({
      food: null,
      otherNames: ["Oats"],
      tags: TAG_VIEWS,
    });
    expect(listFoods.execute).toHaveBeenCalledWith(COACH.id);
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

describe("FoodLibraryController#load", () => {
  it("presents the signed-in coach's food with the names of her other foods and the tag vocabulary", async () => {
    // arrange
    const { controller, findFood } = createController();

    // act
    const editor = await controller.load(argsFor(), FOOD_ID);

    // assert
    expect(editor).toEqual({
      food: OATS_VIEW,
      otherNames: ["Rice"],
      tags: TAG_VIEWS,
    });
    expect(findFood.execute).toHaveBeenCalledWith({
      ownerAccountId: COACH.id,
      foodId: FOOD_ID,
    });
  });

  it.each([
    ["an unknown food", FOOD_ID],
    ["an id that is not a uuid", "not-a-food"],
  ])("sends the coach back to the library for %s", async (_case, id) => {
    // arrange
    const { controller, findFood } = createController();
    findFood.execute.mockResolvedValueOnce({ status: "not-found" });

    // act
    const thrown = await captureThrown(() => controller.load(argsFor(), id));

    // assert
    expect((thrown as Response).status).toBe(302);
    expect((thrown as Response).headers.get("Location")).toBe(
      "/coach/nutrition",
    );
  });
});

describe("FoodLibraryController#create", () => {
  it("creates the food for the signed-in coach and names the library as the next page", async () => {
    // arrange
    const { controller, createFood } = createController();

    // act
    const response = await controller.create(
      argsFor({ request: jsonRequest("POST", OATS_REQUEST) }),
    );

    // assert
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ redirectTo: "/coach/nutrition" });
    expect(createFood.execute).toHaveBeenCalledWith({
      ownerAccountId: COACH.id,
      draft: OATS_REQUEST,
    });
  });

  it("answers 422 with the problems of a draft that breaks a rule", async () => {
    // arrange
    const { controller, createFood } = createController();
    createFood.execute.mockResolvedValueOnce({
      status: "invalid",
      problems: { name: "taken", kcal: "out-of-range" },
    });

    // act
    const response = await controller.create(
      argsFor({ request: jsonRequest("POST", OATS_REQUEST) }),
    );

    // assert
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      problems: { name: "taken", kcal: "out-of-range" },
    });
  });

  it.each([
    ["a body that is not JSON", "{"],
    ["a body missing a field", { ...OATS_REQUEST, fat: undefined }],
    ["a value given as text", { ...OATS_REQUEST, kcal: "389" }],
    ["a tag that is not text", { ...OATS_REQUEST, tagIds: [3] }],
  ])("answers 400 to %s without creating", async (_case, body) => {
    // arrange
    const { controller, createFood } = createController();

    // act
    const response = await controller.create(
      argsFor({ request: jsonRequest("POST", body) }),
    );

    // assert
    expect(response.status).toBe(400);
    expect(createFood.execute).not.toHaveBeenCalled();
  });

  it("answers 500 when the creation failed", async () => {
    // arrange
    const { controller, createFood } = createController();
    createFood.execute.mockResolvedValueOnce({ status: "failed" });

    // act
    const response = await controller.create(
      argsFor({ request: jsonRequest("POST", OATS_REQUEST) }),
    );

    // assert
    expect(response.status).toBe(500);
  });

  it.each([
    ["a signed-in client", CLIENT_SESSION, 403],
    ["a signed-out visitor", ANONYMOUS_SESSION, 401],
  ])("refuses %s", async (_case, session, status) => {
    // arrange
    const { controller, createFood } = createController();

    // act
    const thrown = await captureThrown(() =>
      controller.create(
        argsFor({ session, request: jsonRequest("POST", OATS_REQUEST) }),
      ),
    );

    // assert
    expect((thrown as Response).status).toBe(status);
    expect(createFood.execute).not.toHaveBeenCalled();
  });
});

describe("FoodLibraryController#edit", () => {
  it("edits the signed-in coach's food and names the library as the next page", async () => {
    // arrange
    const { controller, editFood } = createController();

    // act
    const response = await controller.edit(
      argsFor({ request: jsonRequest("PUT", OATS_REQUEST) }),
      FOOD_ID,
    );

    // assert
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ redirectTo: "/coach/nutrition" });
    expect(editFood.execute).toHaveBeenCalledWith({
      ownerAccountId: COACH.id,
      foodId: FOOD_ID,
      draft: OATS_REQUEST,
    });
  });

  it("answers 422 with the problems of a draft that breaks a rule", async () => {
    // arrange
    const { controller, editFood } = createController();
    editFood.execute.mockResolvedValueOnce({
      status: "invalid",
      problems: { defaultPortionGrams: "out-of-range" },
    });

    // act
    const response = await controller.edit(
      argsFor({ request: jsonRequest("PUT", OATS_REQUEST) }),
      FOOD_ID,
    );

    // assert
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      problems: { defaultPortionGrams: "out-of-range" },
    });
  });

  it("answers 404 for an unknown food", async () => {
    // arrange
    const { controller, editFood } = createController();
    editFood.execute.mockResolvedValueOnce({ status: "not-found" });

    // act
    const response = await controller.edit(
      argsFor({ request: jsonRequest("PUT", OATS_REQUEST) }),
      FOOD_ID,
    );

    // assert
    expect(response.status).toBe(404);
  });

  it("answers 404 for an id that is not a uuid without editing", async () => {
    // arrange
    const { controller, editFood } = createController();

    // act
    const response = await controller.edit(
      argsFor({ request: jsonRequest("PUT", OATS_REQUEST) }),
      "not-a-food",
    );

    // assert
    expect(response.status).toBe(404);
    expect(editFood.execute).not.toHaveBeenCalled();
  });

  it("answers 400 to a malformed body without editing", async () => {
    // arrange
    const { controller, editFood } = createController();

    // act
    const response = await controller.edit(
      argsFor({ request: jsonRequest("PUT", { name: "Oats" }) }),
      FOOD_ID,
    );

    // assert
    expect(response.status).toBe(400);
    expect(editFood.execute).not.toHaveBeenCalled();
  });

  it("answers 500 when the edit failed", async () => {
    // arrange
    const { controller, editFood } = createController();
    editFood.execute.mockResolvedValueOnce({ status: "failed" });

    // act
    const response = await controller.edit(
      argsFor({ request: jsonRequest("PUT", OATS_REQUEST) }),
      FOOD_ID,
    );

    // assert
    expect(response.status).toBe(500);
  });

  it.each([
    ["a signed-in client", CLIENT_SESSION, 403],
    ["a signed-out visitor", ANONYMOUS_SESSION, 401],
  ])("refuses %s", async (_case, session, status) => {
    // arrange
    const { controller, editFood } = createController();

    // act
    const thrown = await captureThrown(() =>
      controller.edit(
        argsFor({ session, request: jsonRequest("PUT", OATS_REQUEST) }),
        FOOD_ID,
      ),
    );

    // assert
    expect((thrown as Response).status).toBe(status);
    expect(editFood.execute).not.toHaveBeenCalled();
  });
});
