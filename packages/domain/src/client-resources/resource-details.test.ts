import { describe, expect, it } from "vitest";

import {
  MAX_RESOURCE_DESCRIPTION_LENGTH,
  MAX_RESOURCE_TITLE_LENGTH,
  ResourceDetails,
} from "./resource-details";

describe("ResourceDetails", () => {
  it("keeps a title and description trimmed", () => {
    // arrange
    const input = { title: "  Meal plan  ", description: "\n Week one \t" };

    // act
    const result = ResourceDetails.from(input);

    // assert
    expect(result.status).toBe("valid");
    expect(
      result.status === "valid" ? result.details.toSnapshot() : null,
    ).toEqual({ title: "Meal plan", description: "Week one" });
  });

  it("accepts an empty description", () => {
    // arrange
    const input = { title: "Meal plan", description: "   " };

    // act
    const result = ResourceDetails.from(input);

    // assert
    expect(
      result.status === "valid" ? result.details.toSnapshot() : null,
    ).toEqual({ title: "Meal plan", description: "" });
  });

  it("accepts a title and description at their longest", () => {
    // arrange
    const input = {
      title: "t".repeat(MAX_RESOURCE_TITLE_LENGTH),
      description: "d".repeat(MAX_RESOURCE_DESCRIPTION_LENGTH),
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
    ["a blank title", { title: "   ", description: "" }, { title: "missing" }],
    [
      "a title one character too long",
      { title: "t".repeat(MAX_RESOURCE_TITLE_LENGTH + 1), description: "" },
      { title: "too-long" },
    ],
    [
      "a description one character too long",
      {
        title: "Meal plan",
        description: "d".repeat(MAX_RESOURCE_DESCRIPTION_LENGTH + 1),
      },
      { description: "too-long" },
    ],
    [
      "both fields wrong",
      {
        title: "",
        description: "d".repeat(MAX_RESOURCE_DESCRIPTION_LENGTH + 1),
      },
      { title: "missing", description: "too-long" },
    ],
  ])("refuses %s, naming each problem", (_case, input, problems) => {
    // arrange
    const details = input;

    // act
    const result = ResourceDetails.from(details);

    // assert
    expect(result).toEqual({ status: "invalid", problems });
  });
});
