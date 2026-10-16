import { describe, expect, it } from "vitest";

import { ExerciseNames } from "./exercise-names";

describe("ExerciseNames", () => {
  it.each([
    ["the same name", "Hip thrust"],
    ["a differently cased name", "HIP THRUST"],
    ["a name with surrounding spaces", "  hip Thrust "],
  ])("holds %s as taken", (_case, name) => {
    // arrange
    const names = ExerciseNames.of(["Back squat", "Hip thrust"]);

    // act
    const taken = names.includes(name);

    // assert
    expect(taken).toBe(true);
  });

  it("holds a name none of them has as free", () => {
    // arrange
    const names = ExerciseNames.of(["Hip thrust", "Back squats"]);

    // act
    const taken = names.includes("Back squat");

    // assert
    expect(taken).toBe(false);
  });
});
