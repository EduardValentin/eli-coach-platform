import { describe, expect, it } from "vitest";

import {
  cmToIn,
  formatFeetAndInches,
  inToCm,
  kgToLb,
  lbToKg,
  measureStep,
  measureUnitLabel,
  measureUnitsOf,
  toCanonicalMeasure,
  toDisplayMeasure,
  type MeasureUnits,
} from "./measure-units";

describe("weight conversion", () => {
  it("keeps a pound reading to a tenth and a kilogram reading to a hundredth", () => {
    // arrange
    const typedPounds = 150;

    // act
    const canonical = lbToKg(typedPounds);

    // assert
    expect(canonical).toBe(68.04);
    expect(kgToLb(68)).toBe(149.9);
  });

  it("gives back the pounds she typed after a round trip", () => {
    // arrange
    const readings = [66, 120.5, 149.9, 150, 175.3, 220, 661];

    // act
    const roundTripped = readings.map((pounds) => kgToLb(lbToKg(pounds)));

    // assert
    expect(roundTripped).toEqual(readings);
  });
});

describe("length conversion", () => {
  it("keeps an inch reading to a quarter and a centimetre reading to a half", () => {
    // arrange
    const typedInches = 27;

    // act
    const canonical = inToCm(typedInches);

    // assert
    expect(canonical).toBe(68.5);
    expect(cmToIn(170)).toBe(67);
  });

  it("gives back the inches she typed after a round trip", () => {
    // arrange
    const readings = [15.75, 27, 29.25, 47, 66.25, 66.5, 90.75];

    // act
    const roundTripped = readings.map((inches) => cmToIn(inToCm(inches)));

    // assert
    expect(roundTripped).toEqual(readings);
  });
});

describe("formatFeetAndInches", () => {
  it("spells out feet and inches under an inches reading", () => {
    // arrange
    const inches = 68;

    // act
    const spelled = formatFeetAndInches(inches);

    // assert
    expect(spelled).toBe("5 ft 8 in");
    expect(formatFeetAndInches(66.25)).toBe("5 ft 6 in");
  });
});

describe("measureUnitsOf", () => {
  it.each([
    [
      { weightUnit: "kg", heightUnit: "cm" },
      { weight: "kg", length: "cm" },
    ],
    [
      { weightUnit: "lb", heightUnit: "ft-in" },
      { weight: "lb", length: "in" },
    ],
  ] as const)("reads %o as %o", (preference, expected) => {
    // arrange
    // act
    const units = measureUnitsOf(preference);

    // assert
    expect(units).toEqual(expected);
  });
});

describe("measureUnitLabel and measureStep", () => {
  const metric: MeasureUnits = { weight: "kg", length: "cm" };
  const imperial: MeasureUnits = { weight: "lb", length: "in" };

  it("labels weight by the weight unit and height or circumference by the length unit", () => {
    // arrange
    // act
    // assert
    expect(measureUnitLabel("weight", imperial)).toBe("lb");
    expect(measureUnitLabel("height", imperial)).toBe("in");
    expect(measureUnitLabel("circumference", metric)).toBe("cm");
  });

  it("steps weight by tenths and length by the unit's own grain", () => {
    // arrange
    // act
    // assert
    expect(measureStep("weight", imperial)).toBe("0.1");
    expect(measureStep("circumference", metric)).toBe("0.1");
    expect(measureStep("height", imperial)).toBe("0.25");
  });
});

describe("toDisplayMeasure and toCanonicalMeasure", () => {
  const metric: MeasureUnits = { weight: "kg", length: "cm" };
  const imperial: MeasureUnits = { weight: "lb", length: "in" };

  it("leaves a metric weight and length reading alone but rounds them", () => {
    // arrange
    const weightKg = 74.3;
    const waistCm = 74.3;

    // act
    const displayedWeight = toDisplayMeasure("weight", weightKg, metric);
    const displayedWaist = toDisplayMeasure("circumference", waistCm, metric);

    // assert
    expect(displayedWeight).toBe(74.3);
    expect(displayedWaist).toBe(74.3);
  });

  it("converts a canonical reading to the imperial display unit", () => {
    // arrange
    const weightKg = 68.04;
    const waistCm = 74;

    // act
    const displayedWeight = toDisplayMeasure("weight", weightKg, imperial);
    const displayedWaist = toDisplayMeasure("circumference", waistCm, imperial);

    // assert
    expect(displayedWeight).toBe(150);
    expect(displayedWaist).toBe(29.25);
  });

  it("converts an entered display reading back to canonical kilograms and centimetres", () => {
    // arrange
    const enteredPounds = 150;
    const enteredInches = 29.25;

    // act
    const canonicalWeight = toCanonicalMeasure(
      "weight",
      enteredPounds,
      imperial,
    );
    const canonicalWaist = toCanonicalMeasure(
      "circumference",
      enteredInches,
      imperial,
    );

    // assert
    expect(canonicalWeight).toBe(68.04);
    expect(canonicalWaist).toBe(74.5);
  });

  it("round trips a display reading through canonical storage", () => {
    // arrange
    const enteredPounds = 150;

    // act
    const roundTripped = toDisplayMeasure(
      "weight",
      toCanonicalMeasure("weight", enteredPounds, imperial),
      imperial,
    );

    // assert
    expect(roundTripped).toBe(enteredPounds);
  });
});
