import { describe, expect, it } from "vitest";

import { VISITOR_GENDERS, VISITOR_PRIMARY_GOALS } from "./visitor-profile";

describe("visitor profile vocabulary", () => {
  it("names the three genders a visitor can choose from", () => {
    // arrange
    const genders = VISITOR_GENDERS;

    // act
    const codes = [...genders];

    // assert
    expect(codes).toEqual(["female", "male", "prefer_not_to_say"]);
  });

  it("names the four primary goals a visitor can state", () => {
    // arrange
    const goals = VISITOR_PRIMARY_GOALS;

    // act
    const codes = [...goals];

    // assert
    expect(codes).toEqual([
      "lose_weight",
      "build_muscle",
      "build_strength",
      "maintain_improve_lifestyle",
    ]);
  });
});
