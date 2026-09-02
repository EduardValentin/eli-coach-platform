import { describe, expect, it } from "vitest";

import {
  RECOMMENDED_MACRO_SPLIT,
  budgetForRate,
  cautionRateKgPerWeek,
  dailyEnergyDeltaForRate,
  macroCalories,
  macroGrams,
  maxRateKgPerWeek,
  projectedEndDate,
  rateForDailyEnergyDelta,
  recommendedRateKgPerWeek,
  weeksToTarget,
} from "./nutrition-targets";

describe("turning a weekly rate into a daily budget", () => {
  it("reads half a kilo a week as a 550 kcal deficit", () => {
    // arrange & act & assert — 0.5 * 7700 / 7
    expect(dailyEnergyDeltaForRate(0.5, "DOWN")).toBe(550);
  });

  it("needs a larger surplus to buy the same weight gained", () => {
    // arrange & act & assert — gaining is the less efficient direction
    expect(dailyEnergyDeltaForRate(0.5, "UP")).toBeGreaterThan(
      dailyEnergyDeltaForRate(0.5, "DOWN"),
    );
  });

  it("subtracts the deficit from maintenance when losing", () => {
    // arrange & act & assert
    expect(
      budgetForRate({
        direction: "DOWN",
        rateKgPerWeek: 0.5,
        totalDailyEnergyExpenditure: 2232,
      }),
    ).toBe(1682);
  });

  it("round-trips a budget back into the rate that produced it", () => {
    // arrange & act & assert — typing a budget and dragging a rate must agree
    expect(rateForDailyEnergyDelta(550, "DOWN")).toBeCloseTo(0.5, 5);
  });
});

describe("bounding how fast a client may move", () => {
  it("puts the caution point where the deficit would reach the basal rate", () => {
    // arrange & act — 2232 maintenance against a 1440 basal rate leaves 792 kcal
    const caution = cautionRateKgPerWeek({
      basalMetabolicRate: 1440,
      currentWeightKg: 65,
      direction: "DOWN",
      totalDailyEnergyExpenditure: 2232,
    });

    // assert — 792 * 7 / 7700
    expect(caution).toBeCloseTo(0.72, 2);
  });

  it("scales that point with the client rather than fixing it", () => {
    // arrange & act — only 300 kcal of room between basal and maintenance
    const caution = cautionRateKgPerWeek({
      basalMetabolicRate: 1400,
      currentWeightKg: 55,
      direction: "DOWN",
      totalDailyEnergyExpenditure: 1700,
    });

    // assert — the caution point arrives far sooner for her
    expect(caution).toBeCloseTo(0.27, 2);
  });

  it("caps a gaining rate lower than a losing one", () => {
    // arrange & act & assert
    expect(maxRateKgPerWeek(65, "UP")).toBeLessThan(
      maxRateKgPerWeek(65, "DOWN"),
    );
  });

  it("opens on a recommended pace rather than at zero", () => {
    // arrange & act — 0.5% of 65 kg, floored to a 0.05 step
    const rate = recommendedRateKgPerWeek({
      basalMetabolicRate: 1440,
      currentWeightKg: 65,
      direction: "DOWN",
      totalDailyEnergyExpenditure: 2232,
    });

    // assert
    expect(rate).toBeCloseTo(0.3, 5);
  });

  it("never opens on a pace that would immediately warn the coach", () => {
    // arrange — a client whose maintenance sits close to her basal rate
    const plan = {
      basalMetabolicRate: 1400,
      currentWeightKg: 90,
      direction: "DOWN" as const,
      totalDailyEnergyExpenditure: 1700,
    };

    // act
    const rate = recommendedRateKgPerWeek(plan);

    // assert — bodyweight alone would suggest 0.45, over her 0.27 caution point
    expect(rate).toBeLessThanOrEqual(cautionRateKgPerWeek(plan));
  });
});

describe("projecting when the client arrives", () => {
  it("counts the weeks the change takes at the chosen rate", () => {
    // arrange & act & assert — 5 kg at half a kilo a week
    expect(weeksToTarget(65, 60, 0.5)).toBe(10);
  });

  it("has no end date when the rate is zero", () => {
    // arrange & act & assert — holding weight never arrives
    expect(weeksToTarget(65, 65, 0)).toBeNull();
  });

  it("turns the week count into a date", () => {
    // arrange & act
    const end = projectedEndDate(new Date("2026-09-01T00:00:00Z"), 10);

    // assert — ten weeks is seventy days
    expect(end.toISOString().slice(0, 10)).toBe("2026-11-10");
  });
});

describe("splitting a budget across macros", () => {
  it("always recommends a split that adds up to a whole hundred", () => {
    // arrange & act & assert — a split that did not would fail validation the
    // moment it was prefilled
    for (const split of Object.values(RECOMMENDED_MACRO_SPLIT)) {
      expect(
        split.proteinPercent + split.carbsPercent + split.fatsPercent,
      ).toBe(100);
    }
  });

  it("converts a percentage into the calories it accounts for", () => {
    // arrange & act & assert — 35% of 2000
    expect(macroCalories(2000, 35)).toBe(700);
  });

  it("converts fat calories into grams at 9 kcal per gram", () => {
    // arrange & act & assert — 30% of 2000 is 600 kcal
    expect(macroGrams(2000, 30, "fats")).toBe(67);
  });
});
