import type { DatabaseClient } from "~/shared/database";
import { describe, expect, it, vi } from "vitest";
import type { SessionAccount } from "~/bounded-contexts/access/public/session";

import { createRequestArgs } from "~/composition-root/test-support/request-args";

import { composeNutritionLibraryFeature } from "./composition.server";

const COACH: SessionAccount = {
  authSubjectId: "user_coach",
  id: "acct_coach",
  role: "COACH",
};

const FOOD_ID = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
const RECIPE_ID = "2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e";
const PHOTO_ID = "5e6f7a8b-9c0d-4e1f-8a2b-3c4d5e6f7a8b";

const OATS_REQUEST = {
  name: "Oats",
  category: "carb",
  icon: "grain",
  kcal: 389,
  protein: 16.9,
  carb: 66.3,
  fat: 6.9,
  defaultPortionGrams: 40,
  tagIds: [],
};

const PORRIDGE_REQUEST = {
  name: "Porridge",
  ingredients: [{ foodId: FOOD_ID, grams: 40, method: "boiled" }],
  prepMinutes: 5,
  cookMinutes: 10,
  instructions: "",
  icon: null,
  tagIds: [],
};

describe("composeNutritionLibraryFeature", () => {
  it("lists the library from the foods table", async () => {
    // arrange
    const feature = composeNutritionLibraryFeature(createHandles());

    // act
    const listing = feature.foodLibrary.list(coachArgs());

    // assert
    await expect(listing).rejects.toThrow("database down");
  });

  it("reports a creation that could not reach the foods table to the logger it is handed", async () => {
    // arrange
    const handles = createHandles();
    const feature = composeNutritionLibraryFeature(handles);

    // act
    const response = await feature.foodLibrary.create(
      coachArgs(jsonRequest("POST")),
    );

    // assert
    expect(response.status).toBe(500);
    expect(handles.logger.error).toHaveBeenCalledWith(
      "Food could not be created.",
      { errorCategory: "food_creation_failure", errorClass: "Error" },
    );
  });

  it("reports an edit that could not reach the foods table to the logger it is handed", async () => {
    // arrange
    const handles = createHandles();
    const feature = composeNutritionLibraryFeature(handles);

    // act
    const response = await feature.foodLibrary.edit(
      coachArgs(jsonRequest("PUT")),
      FOOD_ID,
    );

    // assert
    expect(response.status).toBe(500);
    expect(handles.logger.error).toHaveBeenCalledWith(
      "Food edit could not be written.",
      {
        errorCategory: "food_edit_failure",
        errorClass: "Error",
        foodId: FOOD_ID,
      },
    );
  });

  it("lists the recipes from the recipes table", async () => {
    // arrange
    const feature = composeNutritionLibraryFeature(createHandles());

    // act
    const listing = feature.recipeLibrary.list(coachArgs());

    // assert
    await expect(listing).rejects.toThrow("database down");
  });

  it("reports a recipe creation that could not reach the recipes table to the logger it is handed", async () => {
    // arrange
    const handles = createHandles();
    const feature = composeNutritionLibraryFeature(handles);

    // act
    const response = await feature.recipeLibrary.create(
      coachArgs(jsonRequest("POST", PORRIDGE_REQUEST)),
    );

    // assert
    expect(response.status).toBe(500);
    expect(handles.logger.error).toHaveBeenCalledWith(
      "Recipe could not be created.",
      { errorCategory: "recipe_creation_failure", errorClass: "Error" },
    );
  });

  it("reports a recipe edit that could not reach the recipes table to the logger it is handed", async () => {
    // arrange
    const handles = createHandles();
    const feature = composeNutritionLibraryFeature(handles);

    // act
    const response = await feature.recipeLibrary.edit(
      coachArgs(jsonRequest("PUT", PORRIDGE_REQUEST)),
      RECIPE_ID,
    );

    // assert
    expect(response.status).toBe(500);
    expect(handles.logger.error).toHaveBeenCalledWith(
      "Recipe edit could not be written.",
      {
        errorCategory: "recipe_edit_failure",
        errorClass: "Error",
        recipeId: RECIPE_ID,
      },
    );
  });

  it("opens a recipe photo by finding its recipe in the recipes table before the photo store", async () => {
    // arrange
    const handles = createHandles();
    const feature = composeNutritionLibraryFeature(handles);

    // act
    const opening = feature.recipeLibrary.openPhoto(coachArgs(), {
      recipeId: RECIPE_ID,
      photoId: PHOTO_ID,
    });

    // assert
    await expect(opening).rejects.toThrow("database down");
    expect(handles.photoStore.open).not.toHaveBeenCalled();
  });

  it("renders and stores nothing for a recipe creation that could not reach the recipes table", async () => {
    // arrange
    const handles = createHandles();
    const feature = composeNutritionLibraryFeature(handles);
    const form = new FormData();
    form.set(
      "recipe",
      JSON.stringify({ ...PORRIDGE_REQUEST, photo: "attach" }),
    );
    form.set("photo", new File([new Uint8Array([1, 2, 3])], "porridge.jpg"));

    // act
    const response = await feature.recipeLibrary.create(
      coachArgs(
        new Request("https://evoa.fit/api/coach/recipes", {
          body: form,
          method: "POST",
        }),
      ),
    );

    // assert
    expect(response.status).toBe(500);
    expect(handles.photoRenditions.render).not.toHaveBeenCalled();
    expect(handles.photoStore.store).not.toHaveBeenCalled();
  });
});

function createHandles() {
  return {
    clock: { now: () => new Date("2026-10-14T09:00:00.000Z") },
    database: createUnreachableDatabase(),
    logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
    photoRenditions: { render: vi.fn() },
    photoStore: { store: vi.fn(), open: vi.fn(), remove: vi.fn() },
  };
}

function createUnreachableDatabase(): DatabaseClient {
  return {
    select: () => {
      throw new Error("database down");
    },
  } as unknown as DatabaseClient;
}

function jsonRequest(
  method: "POST" | "PUT",
  body: unknown = OATS_REQUEST,
): Request {
  return new Request("https://evoa.fit/api/coach/foods", {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method,
  });
}

function coachArgs(request = new Request("https://evoa.fit/coach/nutrition")) {
  const portal = {
    appBasePath: "/",
    publicAppUrl: "https://evoa.fit",
    signInUrl: "https://accounts.evoa.fit/sign-in",
  };

  return createRequestArgs({
    portal,
    session: { account: COACH, kind: "authenticated" },
    request,
  });
}
