import { describe, expect, it } from "vitest";

import { toggled } from "./toggled";

describe("toggled", () => {
  it("adds a value that is not chosen yet at the end", () => {
    // arrange
    const chosen = ["breakfast", "lunch"];

    // act
    const next = toggled(chosen, "snack");

    // assert
    expect(next).toEqual(["breakfast", "lunch", "snack"]);
  });

  it("removes a value that is already chosen", () => {
    // arrange
    const chosen = ["breakfast", "lunch", "snack"];

    // act
    const next = toggled(chosen, "lunch");

    // assert
    expect(next).toEqual(["breakfast", "snack"]);
  });

  it("leaves the values it was given unchanged", () => {
    // arrange
    const chosen = ["breakfast"];

    // act
    toggled(chosen, "lunch");

    // assert
    expect(chosen).toEqual(["breakfast"]);
  });
});
