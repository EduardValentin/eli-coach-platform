import { describe, expect, it } from "vitest";

import { parseCount, parseRange } from "./row-fields";

describe("row fields", () => {
  it("parses a range typed with a hyphen, an en dash or a single number", () => {
    // arrange
    const typed = ["6-10", "6–10", "8", " 6 - 10 "];

    // act
    const ranges = typed.map(parseRange);

    // assert
    expect(ranges).toEqual([
      { min: 6, max: 10 },
      { min: 6, max: 10 },
      { min: 8, max: 8 },
      { min: 6, max: 10 },
    ]);
  });

  it("refuses a range that is not a number or runs backwards", () => {
    // arrange
    const typed = ["", "abc", "10-6", "6-", "-1"];

    // act
    const ranges = typed.map(parseRange);

    // assert
    expect(ranges).toEqual([null, null, null, null, null]);
  });

  it("parses a count that is a positive whole number", () => {
    // arrange
    const typed = ["3", " 12 ", "0", "", "2.5", "-1", "abc"];

    // act
    const counts = typed.map(parseCount);

    // assert
    expect(counts).toEqual([3, 12, null, null, null, null, null]);
  });
});
