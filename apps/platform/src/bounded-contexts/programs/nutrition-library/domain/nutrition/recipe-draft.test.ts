import { describe, expect, it } from "vitest";

import type { NutritionTag } from "./nutrition-tags-port";
import { RecipeDraft, type RecipeDraftInput } from "./recipe-draft";

const TAGS: NutritionTag[] = [
  { id: "mt-breakfast", family: "meal-time", label: "Breakfast", order: 1 },
  { id: "mt-lunch", family: "meal-time", label: "Lunch", order: 2 },
  { id: "cp-luteal", family: "cycle-phase", label: "Luteal", order: 10 },
  { id: "nu-iron", family: "nutrient", label: "Iron-rich", order: 11 },
  { id: "di-vegetarian", family: "dietary", label: "Vegetarian", order: 15 },
];

const PICKABLE_FOOD_IDS = ["food-oats", "food-milk", "food-archived-honey"];

const PORRIDGE: RecipeDraftInput = {
  name: "Porridge",
  ingredients: [
    { foodId: "food-oats", grams: 40, method: "boiled" },
    { foodId: "food-milk", grams: 250, method: "raw" },
  ],
  prepMinutes: 5,
  cookMinutes: 10,
  instructions: "Simmer the oats in the milk.",
  icon: "pot",
  tagIds: ["mt-breakfast", "di-vegetarian"],
};

function draftOf(input: RecipeDraftInput, otherNames: readonly string[] = []) {
  return RecipeDraft.from(input, {
    otherNames,
    tags: TAGS,
    pickableFoodIds: PICKABLE_FOOD_IDS,
  });
}

function problemsOf(
  input: RecipeDraftInput,
  otherNames: readonly string[] = [],
) {
  const result = draftOf(input, otherNames);

  return result.status === "invalid" ? result.problems : {};
}

function snapshotOf(input: RecipeDraftInput) {
  const result = draftOf(input);

  return result.status === "valid" ? result.draft.toSnapshot() : result;
}

describe("RecipeDraft", () => {
  it("keeps every entry with its ingredients in the order placed, the name and instructions trimmed, meal roles apart from tags", () => {
    // arrange
    const input = {
      ...PORRIDGE,
      name: "  Porridge ",
      instructions: "  Simmer the oats in the milk.\n",
    };

    // act
    const snapshot = snapshotOf(input);

    // assert
    expect(snapshot).toEqual({
      name: "Porridge",
      ingredients: [
        { foodId: "food-oats", grams: 40, method: "boiled" },
        { foodId: "food-milk", grams: 250, method: "raw" },
      ],
      prepMinutes: 5,
      cookMinutes: 10,
      instructions: "Simmer the oats in the milk.",
      icon: "pot",
      mealRoleIds: ["mt-breakfast"],
      tagIds: ["di-vegetarian"],
    });
  });

  it("splits the chosen tags by family, meal-time ones as roles, each once, in the vocabulary's order", () => {
    // arrange
    const input = {
      ...PORRIDGE,
      tagIds: [
        "di-vegetarian",
        "mt-lunch",
        "cp-luteal",
        "mt-breakfast",
        "di-vegetarian",
        "nu-iron",
      ],
    };

    // act
    const snapshot = snapshotOf(input);

    // assert
    expect(snapshot).toMatchObject({
      mealRoleIds: ["mt-breakfast", "mt-lunch"],
      tagIds: ["cp-luteal", "nu-iron", "di-vegetarian"],
    });
  });

  it("keeps the same food placed twice as two ingredients", () => {
    // arrange
    const input = {
      ...PORRIDGE,
      ingredients: [
        { foodId: "food-oats", grams: 40, method: "raw" },
        { foodId: "food-oats", grams: 20, method: "baked" },
      ],
    };

    // act
    const snapshot = snapshotOf(input);

    // assert
    expect(snapshot).toMatchObject({
      ingredients: [
        { foodId: "food-oats", grams: 40, method: "raw" },
        { foodId: "food-oats", grams: 20, method: "baked" },
      ],
    });
  });

  it.each([
    ["a name of 80 characters", { name: "n".repeat(80) }],
    [
      "grams of 1 and 99,999",
      {
        ingredients: [
          { foodId: "food-oats", grams: 1, method: "raw" },
          { foodId: "food-milk", grams: 99_999, method: "steamed" },
        ],
      },
    ],
    ["minutes of 0", { prepMinutes: 0, cookMinutes: 0 }],
    ["minutes of 9,999", { prepMinutes: 9_999, cookMinutes: 9_999 }],
    ["instructions of 2,000 characters", { instructions: "i".repeat(2_000) }],
    [
      "instructions of 2,000 characters with spaces around them",
      { instructions: ` ${"i".repeat(2_000)} ` },
    ],
    ["no ingredients", { ingredients: [] }],
    ["no icon", { icon: null }],
    ["no tags", { tagIds: [] }],
    ["blank instructions", { instructions: "" }],
    [
      "an archived food already placed in the recipe, given among the pickable foods",
      {
        ingredients: [
          { foodId: "food-archived-honey", grams: 10, method: "raw" },
        ],
      },
    ],
  ])("accepts %s", (_case, fields) => {
    // arrange
    const input = { ...PORRIDGE, ...fields };

    // act
    const result = draftOf(input);

    // assert
    expect(result.status).toBe("valid");
  });

  it.each([
    ["no name", { name: "   " }, { name: "missing" }],
    ["a name of 81 characters", { name: "n".repeat(81) }, { name: "too-long" }],
    [
      "prep minutes below 0",
      { prepMinutes: -1 },
      { prepMinutes: "out-of-range" },
    ],
    [
      "prep minutes of 10,000",
      { prepMinutes: 10_000 },
      { prepMinutes: "out-of-range" },
    ],
    [
      "cook minutes that are not whole",
      { cookMinutes: 2.5 },
      { cookMinutes: "out-of-range" },
    ],
    [
      "cook minutes of 10,000",
      { cookMinutes: 10_000 },
      { cookMinutes: "out-of-range" },
    ],
    [
      "instructions of 2,001 characters",
      { instructions: "i".repeat(2_001) },
      { instructions: "too-long" },
    ],
    [
      "a tag outside the vocabulary",
      { tagIds: ["mt-breakfast", "mt-brunch"] },
      { tagIds: "unknown" },
    ],
    ["an icon outside the vocabulary", { icon: "burger" }, { icon: "unknown" }],
  ])("refuses %s", (_case, fields, problems) => {
    // arrange
    const input = { ...PORRIDGE, ...fields };

    // act
    const result = problemsOf(input);

    // assert
    expect(result).toEqual(problems);
  });

  it.each([
    ["0 grams", 0],
    ["100,000 grams", 100_000],
    ["grams that are not whole", 1.5],
    ["grams below 0", -5],
  ])("refuses an ingredient of %s at its position", (_case, grams) => {
    // arrange
    const input = {
      ...PORRIDGE,
      ingredients: [
        { foodId: "food-oats", grams: 40, method: "raw" },
        { foodId: "food-milk", grams, method: "raw" },
      ],
    };

    // act
    const result = problemsOf(input);

    // assert
    expect(result).toEqual({
      ingredients: [{ position: 1, problem: "grams-out-of-range" }],
    });
  });

  it("refuses an ingredient naming a food outside the pickable ones at its position, whatever its grams", () => {
    // arrange
    const input = {
      ...PORRIDGE,
      ingredients: [
        { foodId: "food-rice", grams: 0, method: "raw" },
        { foodId: "food-oats", grams: 40, method: "raw" },
      ],
    };

    // act
    const result = problemsOf(input);

    // assert
    expect(result).toEqual({
      ingredients: [{ position: 0, problem: "unknown-food" }],
    });
  });

  it("refuses an ingredient cooked by a method outside the vocabulary at its position", () => {
    // arrange
    const input = {
      ...PORRIDGE,
      ingredients: [
        { foodId: "food-oats", grams: 40, method: "raw" },
        { foodId: "food-milk", grams: 250, method: "fried" },
      ],
    };

    // act
    const result = problemsOf(input);

    // assert
    expect(result).toEqual({
      ingredients: [{ position: 1, problem: "unknown-method" }],
    });
  });

  it.each([
    ["the same name", "Porridge"],
    ["a differently cased name", "PORRIDGE"],
    ["a name with surrounding spaces", "  porridge "],
  ])("refuses %s another recipe already has", (_case, name) => {
    // arrange
    const input = { ...PORRIDGE, name };

    // act
    const result = problemsOf(input, ["  Porridge  ", "Omelette"]);

    // assert
    expect(result).toEqual({ name: "taken" });
  });

  it("names every problem of a draft that breaks several rules at once", () => {
    // arrange
    const input = {
      ...PORRIDGE,
      name: "",
      ingredients: [
        { foodId: "food-oats", grams: 0, method: "raw" },
        { foodId: "food-milk", grams: 250, method: "raw" },
        { foodId: "food-rice", grams: 100, method: "raw" },
      ],
      prepMinutes: -1,
      cookMinutes: 10_000,
      instructions: "i".repeat(2_001),
    };

    // act
    const result = problemsOf(input);

    // assert
    expect(result).toEqual({
      name: "missing",
      ingredients: [
        { position: 0, problem: "grams-out-of-range" },
        { position: 2, problem: "unknown-food" },
      ],
      prepMinutes: "out-of-range",
      cookMinutes: "out-of-range",
      instructions: "too-long",
    });
  });
});
