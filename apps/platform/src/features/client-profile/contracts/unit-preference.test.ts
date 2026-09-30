import { describe, expect, it } from "vitest";

import { unitPreferenceSchema } from "./unit-preference";

describe("unitPreferenceSchema", () => {
  it("accepts pounds with feet and inches", () => {
    // arrange
    const request = { weightUnit: "lb", heightUnit: "ft-in" };

    // act
    const parsed = unitPreferenceSchema.safeParse(request);

    // assert
    expect(parsed.success).toBe(true);
  });

  it("refuses a unit the platform does not offer", () => {
    // arrange
    const request = { weightUnit: "stone", heightUnit: "cm" };

    // act
    const parsed = unitPreferenceSchema.safeParse(request);

    // assert
    expect(parsed.success).toBe(false);
  });
});
