import { matchPath } from "react-router";
import { describe, expect, it } from "vitest";

import {
  COACH_NUTRITION_PATH,
  COACH_NUTRITION_ROUTE_SEGMENT,
  FOOD_EDITOR_ROUTE_SEGMENT,
  NEW_FOOD_PATH,
  NEW_FOOD_ROUTE_SEGMENT,
  NUTRITION_LIBRARY_API_PATHS,
  foodEditorPath,
  foodPath,
} from "./paths";

const FOOD_ID = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";

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
});
