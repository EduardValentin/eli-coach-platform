import { describe, expect, it } from "vitest";

import { MAX_RESOURCE_TAG_LENGTH, ResourceTags } from "./resource-tags";

function tagsOf(spellings: string[]) {
  const result = ResourceTags.from(spellings);

  if (result.status !== "valid") throw new Error("invalid sample tags");

  return result.tags;
}

describe("ResourceTags", () => {
  it("keeps each tag with its case-folded value", () => {
    // arrange
    const spellings = ["Nutrition", "glutes"];

    // act
    const result = ResourceTags.from(spellings);

    // assert
    expect(result.status).toBe("valid");
    expect(result.status === "valid" ? result.tags.toSnapshot() : null).toEqual(
      [
        { tag: "Nutrition", folded: "nutrition" },
        { tag: "glutes", folded: "glutes" },
      ],
    );
  });

  it("trims each tag and collapses the whitespace inside it", () => {
    // arrange
    const spellings = ["  Meal \t  prep \n", "Rest   Day"];

    // act
    const tags = tagsOf(spellings);

    // assert
    expect(tags.toSnapshot()).toEqual([
      { tag: "Meal prep", folded: "meal prep" },
      { tag: "Rest Day", folded: "rest day" },
    ]);
  });

  it("drops blank tags", () => {
    // arrange
    const spellings = ["", "   ", "Mobility", "\n\t"];

    // act
    const tags = tagsOf(spellings);

    // assert
    expect(tags.toSnapshot()).toEqual([
      { tag: "Mobility", folded: "mobility" },
    ]);
  });

  it("keeps the first spelling of tags that differ only by case or spacing", () => {
    // arrange
    const spellings = ["Meal Prep", "meal prep", "MEAL  PREP ", "Cardio"];

    // act
    const tags = tagsOf(spellings);

    // assert
    expect(tags.toSnapshot()).toEqual([
      { tag: "Meal Prep", folded: "meal prep" },
      { tag: "Cardio", folded: "cardio" },
    ]);
  });

  it("answers no tags for no spellings", () => {
    // arrange
    const spellings: string[] = [];

    // act
    const tags = tagsOf(spellings);

    // assert
    expect(tags.toSnapshot()).toEqual([]);
  });

  it("sets the limit at 30 characters", () => {
    // arrange
    const expected = 30;

    // act
    const limit = MAX_RESOURCE_TAG_LENGTH;

    // assert
    expect(limit).toBe(expected);
  });

  it("accepts a tag of 30 characters once its spacing is tidied", () => {
    // arrange
    const longest = "t".repeat(MAX_RESOURCE_TAG_LENGTH);

    // act
    const result = ResourceTags.from([`  ${longest}  `]);

    // assert
    expect(result.status === "valid" ? result.tags.toSnapshot() : null).toEqual(
      [{ tag: longest, folded: longest }],
    );
  });

  it("measures a tag after collapsing the whitespace inside it", () => {
    // arrange
    const spelling = `${"a".repeat(14)}     ${"b".repeat(15)}`;

    // act
    const result = ResourceTags.from([spelling]);

    // assert
    expect(result.status).toBe("valid");
  });

  it("refuses a tag of 31 characters", () => {
    // arrange
    const spellings = ["Cardio", "t".repeat(MAX_RESOURCE_TAG_LENGTH + 1)];

    // act
    const result = ResourceTags.from(spellings);

    // assert
    expect(result).toEqual({ status: "invalid", problem: "too-long" });
  });

  it("folds by lower-casing alone, so a sharp s and its capital spelling stay two tags", () => {
    // arrange
    const spellings = ["Straße", "STRASSE", "strasse"];

    // act
    const tags = tagsOf(spellings);

    // assert
    expect(tags.toSnapshot()).toEqual([
      { tag: "Straße", folded: "straße" },
      { tag: "STRASSE", folded: "strasse" },
    ]);
  });

  it("folds a dotted capital I into an i with a combining dot", () => {
    // arrange
    const spellings = ["İzmir", "i̇zmir", "izmir"];

    // act
    const tags = tagsOf(spellings);

    // assert
    expect(tags.toSnapshot()).toEqual([
      { tag: "İzmir", folded: "i̇zmir" },
      { tag: "izmir", folded: "izmir" },
    ]);
  });

  describe("stored spellings", () => {
    it("takes the stored spelling of each tag the vocabulary holds and keeps a new one as typed", () => {
      // arrange
      const tags = tagsOf(["meal PREP", "Recovery"]);
      const vocabulary = [
        { tag: "Meal Prep", folded: "meal prep" },
        { tag: "Glutes", folded: "glutes" },
      ];

      // act
      const stored = tags.withStoredSpellings(vocabulary);

      // assert
      expect(stored.toSnapshot()).toEqual([
        { tag: "Meal Prep", folded: "meal prep" },
        { tag: "Recovery", folded: "recovery" },
      ]);
      expect(tags.toSnapshot()[0]).toEqual({
        tag: "meal PREP",
        folded: "meal prep",
      });
    });

    it("matches the vocabulary by the domain's fold alone", () => {
      // arrange
      const tags = tagsOf(["STRASSE", "STRAßE", "İZMİR"]);
      const vocabulary = [
        { tag: "Straße", folded: "straße" },
        { tag: "İzmir", folded: "i̇zmir" },
      ];

      // act
      const stored = tags.withStoredSpellings(vocabulary);

      // assert
      expect(stored.toSnapshot()).toEqual([
        { tag: "STRASSE", folded: "strasse" },
        { tag: "Straße", folded: "straße" },
        { tag: "İZMİR", folded: "i̇zmi̇r" },
      ]);
    });
  });
});
