import { describe, expect, it } from "vitest";

import { BlockWeeks } from "./block-weeks";

describe("BlockWeeks isAllowed", () => {
  it("allows any whole number of weeks from one for a loading block", () => {
    // act
    const allowed = [1, 4, 12].map((weeks) =>
      BlockWeeks.isAllowed("hypertrophy", weeks),
    );

    // assert
    expect(allowed).toEqual([true, true, true]);
  });

  it("refuses no weeks, a part of a week and a number that is not one", () => {
    // act
    const allowed = [0, -2, 2.5, Number.NaN].map((weeks) =>
      BlockWeeks.isAllowed("strength", weeks),
    );

    // assert
    expect(allowed).toEqual([false, false, false, false]);
  });

  it("allows a Deload exactly one week", () => {
    // act
    const allowed = [1, 2].map((weeks) =>
      BlockWeeks.isAllowed("deload", weeks),
    );

    // assert
    expect(allowed).toEqual([true, false]);
  });
});

describe("BlockWeeks forType", () => {
  it("keeps the weeks chosen for a loading block and makes a Deload one week", () => {
    // act
    const weeks = [
      BlockWeeks.forType("foundation", 6),
      BlockWeeks.forType("deload", 4),
    ];

    // assert
    expect(weeks).toEqual([6, 1]);
  });
});
