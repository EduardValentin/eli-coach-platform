import { describe, expect, it } from "vitest";

import { FOOD_CATEGORIES, FOOD_ICONS, TAG_FAMILIES } from "./nutrition";

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
});
