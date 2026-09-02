import { describe, expect, it } from "vitest";

import {
  ageOnDate,
  calculateBasalMetabolicRate,
  calculateTotalDailyEnergyExpenditure,
} from "./body-metrics";

describe("basal metabolic rate", () => {
  it("applies the female Mifflin-St Jeor constant", () => {
    // arrange & act
    const basalMetabolicRate = calculateBasalMetabolicRate({
      ageYears: 30,
      heightCm: 165,
      sex: "FEMALE",
      weightKg: 65,
    });

    // assert — (10 * 65) + (6.25 * 165) - (5 * 30) - 161
    expect(basalMetabolicRate).toBe(1370);
  });

  it("applies the male constant to the same measurements", () => {
    // arrange & act
    const basalMetabolicRate = calculateBasalMetabolicRate({
      ageYears: 30,
      heightCm: 165,
      sex: "MALE",
      weightKg: 65,
    });

    // assert — the formulas differ only by the constant: -161 against +5
    expect(basalMetabolicRate).toBe(1536);
  });
});

describe("total daily energy expenditure", () => {
  it("scales the basal rate by the activity multiplier", () => {
    // arrange & act
    const expenditure = calculateTotalDailyEnergyExpenditure({
      activityLevel: "MODERATELY_ACTIVE",
      basalMetabolicRate: 1370,
    });

    // assert — 1370 * 1.55
    expect(expenditure).toBe(2124);
  });

  it("leaves a sedentary client barely above her basal rate", () => {
    // arrange & act & assert
    expect(
      calculateTotalDailyEnergyExpenditure({
        activityLevel: "SEDENTARY",
        basalMetabolicRate: 1370,
      }),
    ).toBe(1644);
  });
});

describe("age on a given date", () => {
  it("counts full years only", () => {
    // arrange & act & assert
    expect(ageOnDate("1996-03-15", new Date("2026-03-15"))).toBe(30);
  });

  it("does not count a birthday that has not arrived yet this year", () => {
    // arrange & act & assert — one day short of turning 30
    expect(ageOnDate("1996-03-15", new Date("2026-03-14"))).toBe(29);
  });

  it("handles a birthday earlier in the year", () => {
    // arrange & act & assert
    expect(ageOnDate("1996-01-10", new Date("2026-08-31"))).toBe(30);
  });
});
