import { describe, expect, it } from "vitest";

import { UnitPreference } from "./unit-preference";

describe("UnitPreference.of", () => {
  it.each([
    ["metric", { weightUnit: "kg", heightUnit: "cm" }],
    ["imperial", { weightUnit: "lb", heightUnit: "ft-in" }],
  ] as const)("reads the units of the %s system", (system, expected) => {
    // arrange
    // act
    const preference = UnitPreference.of(system);

    // assert
    expect(preference.toSnapshot()).toEqual(expected);
  });
});

describe("UnitPreference.from", () => {
  it("rehydrates the units a snapshot holds", () => {
    // arrange
    const snapshot = { weightUnit: "lb", heightUnit: "ft-in" } as const;

    // act
    const preference = UnitPreference.from(snapshot);

    // assert
    expect(preference.weightUnit).toBe("lb");
    expect(preference.heightUnit).toBe("ft-in");
  });
});

describe("UnitPreference.metric", () => {
  it("is kilograms and centimetres", () => {
    // arrange
    // act
    const preference = UnitPreference.metric();

    // assert
    expect(preference.toSnapshot()).toEqual({
      weightUnit: "kg",
      heightUnit: "cm",
    });
  });
});

describe("UnitPreference#measurementSystem", () => {
  it.each([
    [{ weightUnit: "kg", heightUnit: "cm" }, "metric"],
    [{ weightUnit: "lb", heightUnit: "ft-in" }, "imperial"],
  ] as const)("reads the system off %o", (snapshot, expected) => {
    // arrange
    const preference = UnitPreference.from(snapshot);

    // act
    const system = preference.measurementSystem();

    // assert
    expect(system).toBe(expected);
  });
});

describe("UnitPreference#toSnapshot", () => {
  it("hands back plain units that survive a round trip", () => {
    // arrange
    const preference = UnitPreference.of("imperial");

    // act
    const snapshot = preference.toSnapshot();

    // assert
    expect(snapshot).toEqual({ weightUnit: "lb", heightUnit: "ft-in" });
    expect(Object.getPrototypeOf(snapshot)).toBe(Object.prototype);
    expect(UnitPreference.from(snapshot)).toEqual(preference);
  });
});
