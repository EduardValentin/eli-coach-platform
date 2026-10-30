import { describe, expect, it } from "vitest";

import { waistToHeightRatio } from "./body-metrics";

describe("waistToHeightRatio", () => {
  it("divides her waist by her height to two decimal places", () => {
    // arrange
    const waistCm = 74;
    const heightCm = 168;

    // act
    const ratio = waistToHeightRatio(waistCm, heightCm);

    // assert
    expect(ratio).toBe("0.44");
  });

  it.each([
    { waistCm: null, heightCm: 168 },
    { waistCm: 74, heightCm: null },
  ])(
    "has no ratio while a value is missing (waist $waistCm, height $heightCm)",
    ({ waistCm, heightCm }) => {
      // arrange
      const values = { waistCm, heightCm };

      // act
      const ratio = waistToHeightRatio(values.waistCm, values.heightCm);

      // assert
      expect(ratio).toBeNull();
    },
  );

  it.each([
    { waistCm: 0, heightCm: 168 },
    { waistCm: 74, heightCm: 0 },
    { waistCm: -74, heightCm: 168 },
    { waistCm: 74, heightCm: -168 },
  ])(
    "has no ratio for a value that is not above zero (waist $waistCm, height $heightCm)",
    ({ waistCm, heightCm }) => {
      // arrange
      const values = { waistCm, heightCm };

      // act
      const ratio = waistToHeightRatio(values.waistCm, values.heightCm);

      // assert
      expect(ratio).toBeNull();
    },
  );
});
