import { matchPath } from "react-router";
import { describe, expect, it } from "vitest";

import {
  COACH_NUTRITION_PATH,
  COACH_NUTRITION_ROUTE_SEGMENT,
  COACH_RECIPES_PATH,
  FOOD_EDITOR_ROUTE_SEGMENT,
  NEW_FOOD_PATH,
  NEW_FOOD_ROUTE_SEGMENT,
  NEW_RECIPE_PATH,
  NUTRITION_LIBRARY_API_PATHS,
  NUTRITION_TAB_PARAM,
  NUTRITION_TABS,
  RECIPE_BUILDER_ROUTE_SEGMENT,
  RECIPE_EDITOR_ROUTE_SEGMENT,
  foodEditorPath,
  foodPath,
  nutritionTabOf,
  recipeBuilderPath,
  recipePath,
  recipePhotoPath,
} from "./paths";

const FOOD_ID = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
const RECIPE_ID = "2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e";
const PHOTO_ID = "3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e6f";

describe("nutrition library paths", () => {
  it("links the coach to the library the coach portal registers", () => {
    // arrange
    const link = COACH_NUTRITION_PATH;

    // act
    const match = matchPath(`/coach/${COACH_NUTRITION_ROUTE_SEGMENT}`, link);

    // assert
    expect(link).toBe("/coach/nutrition");
    expect(match).not.toBeNull();
  });

  it("links the coach to the editor of a new food", () => {
    // arrange
    const link = NEW_FOOD_PATH;

    // act
    const match = matchPath(`/coach/${NEW_FOOD_ROUTE_SEGMENT}`, link);

    // assert
    expect(link).toBe("/coach/nutrition/foods/new");
    expect(match).not.toBeNull();
  });

  it("links the coach to the editor of a saved food", () => {
    // arrange
    const link = foodEditorPath(FOOD_ID);

    // act
    const match = matchPath(`/coach/${FOOD_EDITOR_ROUTE_SEGMENT}`, link);

    // assert
    expect(link).toBe(`/coach/nutrition/foods/${FOOD_ID}`);
    expect(match?.params).toEqual({ foodId: FOOD_ID });
  });

  it("sends a new food to the collection and a saved one to its own endpoint", () => {
    // arrange
    const endpoint = foodPath(FOOD_ID);

    // act
    const match = matchPath(NUTRITION_LIBRARY_API_PATHS.food, endpoint);

    // assert
    expect(NUTRITION_LIBRARY_API_PATHS.foods).toBe("/api/coach/foods");
    expect(endpoint).toBe(`/api/coach/foods/${FOOD_ID}`);
    expect(match?.params).toEqual({ foodId: FOOD_ID });
  });

  it("links the coach to the builder of a new recipe", () => {
    // arrange
    const link = NEW_RECIPE_PATH;

    // act
    const match = matchPath(`/coach/${RECIPE_BUILDER_ROUTE_SEGMENT}`, link);

    // assert
    expect(link).toBe("/coach/nutrition/recipe-builder");
    expect(match).not.toBeNull();
  });

  it("links the coach to the builder of a saved recipe", () => {
    // arrange
    const link = recipeBuilderPath(RECIPE_ID);

    // act
    const match = matchPath(`/coach/${RECIPE_EDITOR_ROUTE_SEGMENT}`, link);

    // assert
    expect(link).toBe(`/coach/nutrition/recipe-builder/${RECIPE_ID}`);
    expect(match?.params).toEqual({ recipeId: RECIPE_ID });
  });

  it("sends a new recipe to the collection and a saved one to its own endpoint", () => {
    // arrange
    const endpoint = recipePath(RECIPE_ID);

    // act
    const match = matchPath(NUTRITION_LIBRARY_API_PATHS.recipe, endpoint);

    // assert
    expect(NUTRITION_LIBRARY_API_PATHS.recipes).toBe("/api/coach/recipes");
    expect(endpoint).toBe(`/api/coach/recipes/${RECIPE_ID}`);
    expect(match?.params).toEqual({ recipeId: RECIPE_ID });
  });

  it("returns the coach to the Recipes tab of the library", () => {
    // arrange
    const link = new URL(COACH_RECIPES_PATH, "https://evoa.fit");

    // act
    const tab = nutritionTabOf(link.searchParams);

    // assert
    expect(COACH_RECIPES_PATH).toBe("/coach/nutrition?tab=recipes");
    expect(link.pathname).toBe(COACH_NUTRITION_PATH);
    expect(tab).toBe("recipes");
  });

  it.each([
    ["no tab", "", "foods"],
    ["the Foods tab", "tab=foods", "foods"],
    ["the Recipes tab", "tab=recipes", "recipes"],
    ["an unknown tab", "tab=plans", "foods"],
  ])("opens %s as the right tab", (_case, query, expected) => {
    // arrange
    const searchParams = new URLSearchParams(query);

    // act
    const tab = nutritionTabOf(searchParams);

    // assert
    expect(tab).toBe(expected);
    expect(NUTRITION_TAB_PARAM).toBe("tab");
    expect(NUTRITION_TABS).toEqual(["foods", "recipes"]);
  });

  it("addresses a recipe's stored photo outside the coach API, by recipe and photo id", () => {
    // arrange
    const address = recipePhotoPath(RECIPE_ID, PHOTO_ID);

    // act
    const match = matchPath(NUTRITION_LIBRARY_API_PATHS.recipePhoto, address);

    // assert
    expect(address).toBe(`/api/recipes/${RECIPE_ID}/photo/${PHOTO_ID}`);
    expect(match?.params).toEqual({ recipeId: RECIPE_ID, photoId: PHOTO_ID });
  });
});
