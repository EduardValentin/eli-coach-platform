import { describe, expect, it } from "vitest";

import {
  DEFAULT_UNIT_PREFERENCE,
  measurementSystemOf,
  unitPreferenceOf,
} from "./unit-preference";

describe("unitPreferenceOf", () => {
  it.each([
    ["metric", { weightUnit: "kg", heightUnit: "cm" }],
    ["imperial", { weightUnit: "lb", heightUnit: "ft-in" }],
  ] as const)("reads the units of the %s system", (system, expected) => {
    // arrange
    // act
    const preference = unitPreferenceOf(system);

    // assert
    expect(preference).toEqual(expected);
  });
});

describe("measurementSystemOf", () => {
  it.each([
    [{ weightUnit: "kg", heightUnit: "cm" }, "metric"],
    [{ weightUnit: "lb", heightUnit: "ft-in" }, "imperial"],
  ] as const)("reads the system off %o", (preference, expected) => {
    // arrange
    // act
    const system = measurementSystemOf(preference);

    // assert
    expect(system).toBe(expected);
  });
});

describe("DEFAULT_UNIT_PREFERENCE", () => {
  it("is kilograms and centimetres", () => {
    // arrange
    // act
    // assert
    expect(DEFAULT_UNIT_PREFERENCE).toEqual({
      weightUnit: "kg",
      heightUnit: "cm",
    });
  });
});
