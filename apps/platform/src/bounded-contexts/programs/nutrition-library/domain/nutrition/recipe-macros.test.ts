import { describe, expect, it } from "vitest";

import { RecipeMacros } from "./recipe-macros";

const OATS = { id: "food-1", kcal: 389, protein: 16.9, carb: 66.3, fat: 6.9 };
const MILK = { id: "food-2", kcal: 42, protein: 3.4, carb: 5, fat: 1 };
const WATER = { id: "food-3", kcal: 0, protein: 0, carb: 0, fat: 0 };

describe("RecipeMacros", () => {
  it("sums each food's values per 100 g scaled by its grams and rounds each total to a whole number", () => {
    // arrange
    const ingredients = [
      { foodId: "food-1", grams: 40 },
      { foodId: "food-2", grams: 250 },
    ];

    // act
    const macros = RecipeMacros.of(ingredients, [OATS, MILK]);

    // assert
    expect(macros.toSnapshot()).toEqual({
      kcal: 261,
      protein: 15,
      carb: 39,
      fat: 5,
    });
  });

  it("counts a food placed twice once for each placement", () => {
    // arrange
    const ingredients = [
      { foodId: "food-1", grams: 40 },
      { foodId: "food-1", grams: 60 },
    ];

    // act
    const macros = RecipeMacros.of(ingredients, [OATS]);

    // assert
    expect(macros.toSnapshot()).toEqual({
      kcal: 389,
      protein: 17,
      carb: 66,
      fat: 7,
    });
  });

  it("adds nothing for a food with no calories", () => {
    // arrange
    const ingredients = [
      { foodId: "food-2", grams: 100 },
      { foodId: "food-3", grams: 500 },
    ];

    // act
    const macros = RecipeMacros.of(ingredients, [MILK, WATER]);

    // assert
    expect(macros.toSnapshot()).toEqual({
      kcal: 42,
      protein: 3,
      carb: 5,
      fat: 1,
    });
  });

  it("is all zeros for a recipe with no ingredients", () => {
    // arrange
    const ingredients: { foodId: string; grams: number }[] = [];

    // act
    const macros = RecipeMacros.of(ingredients, [OATS]);

    // assert
    expect(macros.toSnapshot()).toEqual({
      kcal: 0,
      protein: 0,
      carb: 0,
      fat: 0,
    });
  });

  it("adds nothing for an ingredient whose food is not among the foods given", () => {
    // arrange
    const ingredients = [
      { foodId: "food-1", grams: 100 },
      { foodId: "food-9", grams: 100 },
    ];

    // act
    const macros = RecipeMacros.of(ingredients, [OATS]);

    // assert
    expect(macros.toSnapshot()).toEqual({
      kcal: 389,
      protein: 17,
      carb: 66,
      fat: 7,
    });
  });

  it("rounds half up after summing, not per ingredient", () => {
    // arrange
    const halfGram = { id: "food-4", kcal: 50, protein: 0.5, carb: 0, fat: 0 };
    const ingredients = [
      { foodId: "food-4", grams: 100 },
      { foodId: "food-4", grams: 100 },
      { foodId: "food-4", grams: 100 },
    ];

    // act
    const macros = RecipeMacros.of(ingredients, [halfGram]);

    // assert
    expect(macros.toSnapshot()).toEqual({
      kcal: 150,
      protein: 2,
      carb: 0,
      fat: 0,
    });
  });
});
