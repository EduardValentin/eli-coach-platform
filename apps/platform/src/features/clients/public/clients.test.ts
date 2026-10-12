import { describe, expect, it } from "vitest";

import { bundleLengthLabel } from "./clients";

describe("bundleLengthLabel", () => {
  it.each([
    [1, "1 month"],
    [3, "3 months"],
    [6, "6 months"],
  ])("words a bundle of %i months as its length", (months, expected) => {
    // arrange
    const bundleMonths = months;

    // act
    const label = bundleLengthLabel(bundleMonths);

    // assert
    expect(label).toBe(expected);
  });
});
