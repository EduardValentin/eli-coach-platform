import { describe, expect, it } from "vitest";

import { FoodDraft, type FoodDraftInput } from "./food-draft";

const KNOWN_TAG_IDS = ["mt-breakfast", "mt-lunch", "di-vegetarian"];

const CHICKEN: FoodDraftInput = {
  name: "Chicken breast",
  category: "protein",
  icon: "poultry",
  kcal: 165,
  protein: 31,
  carb: 0,
  fat: 3.6,
  defaultPortionGrams: 150,
  tagIds: ["mt-lunch"],
};

function draftOf(input: FoodDraftInput, otherNames: readonly string[] = []) {
  return FoodDraft.from(input, { otherNames, knownTagIds: KNOWN_TAG_IDS });
}

function problemsOf(input: FoodDraftInput, otherNames: readonly string[] = []) {
  const result = draftOf(input, otherNames);

  return result.status === "invalid" ? result.problems : {};
}

describe("FoodDraft", () => {
  it("keeps every entry, the name trimmed", () => {
    // arrange
    const input = { ...CHICKEN, name: "  Chicken breast  " };

    // act
    const result = draftOf(input);

    // assert
    expect(
      result.status === "valid" ? result.draft.toSnapshot() : result,
    ).toEqual({ ...CHICKEN, name: "Chicken breast" });
  });

  it("keeps each chosen tag once, in the order chosen", () => {
    // arrange
    const input = {
      ...CHICKEN,
      tagIds: ["di-vegetarian", "mt-breakfast", "di-vegetarian"],
    };

    // act
    const result = draftOf(input);

    // assert
    expect(
      result.status === "valid" ? result.draft.toSnapshot().tagIds : result,
    ).toEqual(["di-vegetarian", "mt-breakfast"]);
  });

  it("turns a portion of 0 grams into the default 100 grams", () => {
    // arrange
    const input = { ...CHICKEN, defaultPortionGrams: 0 };

    // act
    const result = draftOf(input);

    // assert
    expect(
      result.status === "valid"
        ? result.draft.toSnapshot().defaultPortionGrams
        : result,
    ).toBe(100);
  });

  it("accepts a name of 80 characters, values of 0 and 9,999.99, two decimals and a portion of 1 and 99,999 grams", () => {
    // arrange
    const inputs = [
      { ...CHICKEN, name: "n".repeat(80) },
      { ...CHICKEN, kcal: 0, protein: 0, carb: 0, fat: 0 },
      { ...CHICKEN, kcal: 9_999.99, protein: 9_999.99 },
      { ...CHICKEN, carb: 1.23, fat: 0.01 },
      { ...CHICKEN, defaultPortionGrams: 1 },
      { ...CHICKEN, defaultPortionGrams: 99_999 },
    ];

    // act
    const statuses = inputs.map((input) => draftOf(input).status);

    // assert
    expect(statuses).toEqual(inputs.map(() => "valid"));
  });

  it.each([
    ["no name", { name: "   " }, { name: "missing" }],
    ["a name of 81 characters", { name: "n".repeat(81) }, { name: "too-long" }],
    [
      "a name of 80 characters inside spaces counted after trimming",
      { name: ` ${"n".repeat(80)} ` },
      {},
    ],
    ["calories over 9,999.99", { kcal: 10_000 }, { kcal: "out-of-range" }],
    ["protein below 0", { protein: -1 }, { protein: "out-of-range" }],
    ["carbs with three decimals", { carb: 1.234 }, { carb: "out-of-range" }],
    ["fat that is not a number", { fat: Number.NaN }, { fat: "out-of-range" }],
    [
      "calories that are infinite",
      { kcal: Number.POSITIVE_INFINITY },
      { kcal: "out-of-range" },
    ],
    [
      "a portion of half a gram",
      { defaultPortionGrams: 0.5 },
      { defaultPortionGrams: "out-of-range" },
    ],
    [
      "a portion of 100,000 grams",
      { defaultPortionGrams: 100_000 },
      { defaultPortionGrams: "out-of-range" },
    ],
    [
      "a negative portion",
      { defaultPortionGrams: -5 },
      { defaultPortionGrams: "out-of-range" },
    ],
  ])("names the problem with %s", (_case, entries, problems) => {
    // arrange
    const input = { ...CHICKEN, ...entries };

    // act
    const found = problemsOf(input);

    // assert
    expect(found).toEqual(problems);
  });

  it("names every rule broken at once", () => {
    // arrange
    const input = {
      ...CHICKEN,
      name: "",
      kcal: -1,
      protein: 10_000,
      carb: 0.001,
      fat: -0.01,
      defaultPortionGrams: 100_000,
    };

    // act
    const found = problemsOf(input);

    // assert
    expect(found).toEqual({
      name: "missing",
      kcal: "out-of-range",
      protein: "out-of-range",
      carb: "out-of-range",
      fat: "out-of-range",
      defaultPortionGrams: "out-of-range",
    });
  });

  it.each([
    ["the same name", "Chicken breast"],
    ["a differently cased name", "CHICKEN BREAST"],
    ["a name inside spaces", "  chicken Breast "],
  ])("refuses %s another food already has", (_case, name) => {
    // arrange
    const input = { ...CHICKEN, name };

    // act
    const found = problemsOf(input, ["Oats", " Chicken breast "]);

    // assert
    expect(found).toEqual({ name: "taken" });
  });

  it("accepts a name no other food has", () => {
    // arrange
    const input = { ...CHICKEN, name: "Chicken thigh" };

    // act
    const result = draftOf(input, ["Chicken breast"]);

    // assert
    expect(result.status).toBe("valid");
  });

  it("refuses a category, an icon and tags outside the vocabulary before any other rule", () => {
    // arrange
    const input = {
      ...CHICKEN,
      name: "",
      category: "dessert",
      icon: "pizza",
      tagIds: ["mt-lunch", "mt-brunch"],
    };

    // act
    const found = problemsOf(input);

    // assert
    expect(found).toEqual({
      category: "unknown",
      icon: "unknown",
      tagIds: "unknown",
    });
  });
});
