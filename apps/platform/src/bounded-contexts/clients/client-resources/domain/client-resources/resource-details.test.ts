import { describe, expect, it } from "vitest";

import {
  MAX_RESOURCE_DESCRIPTION_LENGTH,
  MAX_RESOURCE_TITLE_LENGTH,
  ResourceDetails,
} from "./resource-details";
import { MAX_RESOURCE_TAG_LENGTH } from "./resource-tags";

describe("ResourceDetails", () => {
  it("keeps a title and description trimmed", () => {
    // arrange
    const input = {
      title: "  Meal plan  ",
      description: "\n Week one \t",
      tags: [],
    };

    // act
    const result = ResourceDetails.from(input);

    // assert
    expect(result.status).toBe("valid");
    expect(
      result.status === "valid" ? result.details.toSnapshot() : null,
    ).toEqual({ title: "Meal plan", description: "Week one", tags: [] });
  });

  it("accepts an empty description", () => {
    // arrange
    const input = { title: "Meal plan", description: "   ", tags: [] };

    // act
    const result = ResourceDetails.from(input);

    // assert
    expect(
      result.status === "valid" ? result.details.toSnapshot() : null,
    ).toEqual({ title: "Meal plan", description: "", tags: [] });
  });

  it("accepts a title and description at their longest", () => {
    // arrange
    const input = {
      title: "t".repeat(MAX_RESOURCE_TITLE_LENGTH),
      description: "d".repeat(MAX_RESOURCE_DESCRIPTION_LENGTH),
      tags: ["t".repeat(MAX_RESOURCE_TAG_LENGTH)],
    };

    // act
    const result = ResourceDetails.from(input);

    // assert
    expect(result.status).toBe("valid");
  });

  it("sets the limits at 120 and 2,000 characters", () => {
    // arrange
    const expected = [120, 2_000];

    // act
    const limits = [MAX_RESOURCE_TITLE_LENGTH, MAX_RESOURCE_DESCRIPTION_LENGTH];

    // assert
    expect(limits).toEqual(expected);
  });

  it.each([
    [
      "a blank title",
      { title: "   ", description: "", tags: [] },
      { title: "missing" },
    ],
    [
      "a title one character too long",
      {
        title: "t".repeat(MAX_RESOURCE_TITLE_LENGTH + 1),
        description: "",
        tags: [],
      },
      { title: "too-long" },
    ],
    [
      "a description one character too long",
      {
        title: "Meal plan",
        description: "d".repeat(MAX_RESOURCE_DESCRIPTION_LENGTH + 1),
        tags: [],
      },
      { description: "too-long" },
    ],
    [
      "a tag one character too long",
      {
        title: "Meal plan",
        description: "",
        tags: ["Cardio", "t".repeat(MAX_RESOURCE_TAG_LENGTH + 1)],
      },
      { tags: "too-long" },
    ],
    [
      "every field wrong",
      {
        title: "",
        description: "d".repeat(MAX_RESOURCE_DESCRIPTION_LENGTH + 1),
        tags: ["t".repeat(MAX_RESOURCE_TAG_LENGTH + 1)],
      },
      { title: "missing", description: "too-long", tags: "too-long" },
    ],
  ])("refuses %s, naming each problem", (_case, input, problems) => {
    // arrange
    const details = input;

    // act
    const result = ResourceDetails.from(details);

    // assert
    expect(result).toEqual({ status: "invalid", problems });
  });

  it("keeps its tags tidied, once each, in the order they were given", () => {
    // arrange
    const input = {
      title: "Meal plan",
      description: "",
      tags: [" Meal  Prep ", "", "meal prep", "Glutes"],
    };

    // act
    const result = ResourceDetails.from(input);

    // assert
    expect(
      result.status === "valid" ? result.details.toSnapshot().tags : null,
    ).toEqual([
      { tag: "Meal Prep", folded: "meal prep" },
      { tag: "Glutes", folded: "glutes" },
    ]);
  });

  it("takes the stored spelling of a tag the vocabulary holds and keeps the rest", () => {
    // arrange
    const result = ResourceDetails.from({
      title: "Meal plan",
      description: "Week one",
      tags: ["MEAL PREP", "Recovery"],
    });
    const vocabulary = [{ tag: "Meal Prep", folded: "meal prep" }];

    // act
    const stored =
      result.status === "valid"
        ? result.details.withStoredSpellings(vocabulary).toSnapshot()
        : null;

    // assert
    expect(stored).toEqual({
      title: "Meal plan",
      description: "Week one",
      tags: [
        { tag: "Meal Prep", folded: "meal prep" },
        { tag: "Recovery", folded: "recovery" },
      ],
    });
  });
});
