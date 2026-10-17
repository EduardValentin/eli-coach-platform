import { describe, expect, it } from "vitest";

import {
  COOKING_METHODS,
  FOOD_CATEGORIES,
  FOOD_ICONS,
  RECIPE_ICONS,
  TAG_FAMILIES,
} from "./nutrition";

describe("nutrition vocabulary", () => {
  it("holds the six categories and the four tag families in the library's order", () => {
    // arrange
    const expected = {
      categories: ["protein", "carb", "fat", "legume", "extra", "seasoning"],
      families: ["meal-time", "cycle-phase", "nutrient", "dietary"],
    };

    // act
    const vocabulary = { categories: FOOD_CATEGORIES, families: TAG_FAMILIES };

    // assert
    expect(vocabulary).toEqual(expected);
  });

  it("holds 28 icons, the first an egg and the last the neutral other", () => {
    // arrange
    const expected = { count: 28, first: "egg", last: "other" };

    // act
    const icons = {
      count: new Set(FOOD_ICONS).size,
      first: FOOD_ICONS[0],
      last: FOOD_ICONS.at(-1),
    };

    // assert
    expect(icons).toEqual(expected);
  });

  it("holds the six cooking methods with raw first, the default", () => {
    // arrange
    const expected = [
      "raw",
      "boiled",
      "grilled",
      "baked",
      "pan-fried",
      "steamed",
    ];

    // act
    const methods = COOKING_METHODS;

    // assert
    expect(methods).toEqual(expected);
  });

  it("holds the 17 meal icons, the first a soup and the last the neutral meal", () => {
    // arrange
    const expected = { count: 17, first: "soup", last: "meal" };

    // act
    const icons = {
      count: new Set(RECIPE_ICONS).size,
      first: RECIPE_ICONS[0],
      last: RECIPE_ICONS.at(-1),
    };

    // assert
    expect(icons).toEqual(expected);
  });
});
