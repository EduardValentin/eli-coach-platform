import { describe, expect, it } from "vitest";

import { recipeMacrosOf } from "./recipe-form";

const OATS = { id: "oats", kcal: 380, protein: 13, carb: 60, fat: 7 };
const YOGURT = { id: "yogurt", kcal: 60, protein: 10, carb: 4, fat: 0 };

describe("recipe macros", () => {
  it("adds up the whole recipe from the grams entered for each ingredient", () => {
    // arrange
    const ingredients = [
      { foodId: "oats", grams: "50", method: "raw" as const },
      { foodId: "yogurt", grams: "150", method: "raw" as const },
    ];

    // act
    const macros = recipeMacrosOf(ingredients, [OATS, YOGURT]);

    // assert
    expect(macros).toEqual({ kcal: 280, protein: 22, carb: 36, fat: 4 });
  });

  it("counts an ingredient whose grams are empty or not a number as none", () => {
    // arrange
    const ingredients = [
      { foodId: "oats", grams: "", method: "raw" as const },
      { foodId: "yogurt", grams: "abc", method: "boiled" as const },
    ];

    // act
    const macros = recipeMacrosOf(ingredients, [OATS, YOGURT]);

    // assert
    expect(macros).toEqual({ kcal: 0, protein: 0, carb: 0, fat: 0 });
  });
});
