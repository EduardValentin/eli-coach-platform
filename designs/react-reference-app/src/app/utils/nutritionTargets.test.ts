import { describe, expect, it } from 'vitest';
import {
  RECOMMENDED_MACRO_SPLIT,
  WEIGHT_DIRECTION_BY_GOAL,
  budgetForRate,
  cautionRateKgPerWeek,
  compareToMaintenance,
  dailyEnergyDeltaForRate,
  macroCalories,
  macroGrams,
  maxRateKgPerWeek,
  projectedEndDate,
  rateForDailyEnergyDelta,
  weeksToTarget,
} from './nutritionTargets';

describe('recommended macro splits', () => {
  it('always adds up to a whole hundred percent', () => {
    // arrange
    const splits = Object.values(RECOMMENDED_MACRO_SPLIT);

    // act & assert — a split that did not total 100 would fail the wizard's
    // own validation the moment it was prefilled
    for (const split of splits) {
      expect(split.protein + split.carbs + split.fats).toBe(100);
    }
  });
});

describe('translating a split into food', () => {
  it('converts a percentage into the calories it accounts for', () => {
    // arrange & act & assert — 35% of 2000
    expect(macroCalories(2000, 35)).toBe(700);
  });

  it('converts protein calories into grams at 4 kcal per gram', () => {
    // arrange & act & assert — 700 kcal / 4
    expect(macroGrams(2000, 35, 'protein')).toBe(175);
  });

  it('converts fat calories into grams at 9 kcal per gram', () => {
    // arrange & act & assert — 30% of 2000 = 600 kcal, / 9
    expect(macroGrams(2000, 30, 'fats')).toBe(67);
  });
});

describe('comparing a target to maintenance', () => {
  it('reports a small change as balanced', () => {
    // arrange & act
    const balance = compareToMaintenance(2000, 2124);

    // assert
    expect(balance.deltaKcal).toBe(-124);
    expect(balance.percentOfTdee).toBe(-6);
    expect(balance.severity).toBe('balanced');
  });

  it('reports a normal coaching deficit as moderate', () => {
    // arrange & act & assert — the 20% fat-loss recommendation
    expect(compareToMaintenance(1699, 2124).severity).toBe('moderate');
  });

  it('flags an aggressive deficit as steep', () => {
    // arrange & act
    const balance = compareToMaintenance(1200, 2124);

    // assert
    expect(balance.severity).toBe('steep');
    expect(balance.deltaKcal).toBe(-924);
  });

  it('flags a large surplus as steep too', () => {
    // arrange & act & assert
    expect(compareToMaintenance(3000, 2124).severity).toBe('steep');
  });
});

describe('which way a goal may move the weight', () => {
  it('never lets a fat-loss, maintenance or recomposition target rise', () => {
    // arrange & act & assert
    for (const goal of ['Fat Loss', 'Maintenance', 'Recomposition'] as const) {
      expect(WEIGHT_DIRECTION_BY_GOAL[goal]).toBe('down');
    }
  });

  it('never lets a muscle-building or strength target fall', () => {
    // arrange & act & assert
    for (const goal of ['Muscle Building', 'Strength'] as const) {
      expect(WEIGHT_DIRECTION_BY_GOAL[goal]).toBe('up');
    }
  });

  it('leaves a custom goal free to move either way', () => {
    // arrange & act & assert
    expect(WEIGHT_DIRECTION_BY_GOAL.Custom).toBe('either');
  });
});

describe('turning a weekly rate into a daily budget', () => {
  it('reads half a kilo a week as a 550 kcal deficit', () => {
    // arrange & act & assert - 0.5 * 7700 / 7
    expect(dailyEnergyDeltaForRate(0.5, 'down')).toBe(550);
  });

  it('needs a larger surplus to buy the same weight gained', () => {
    // arrange & act & assert - gaining is the less efficient direction
    expect(dailyEnergyDeltaForRate(0.5, 'up')).toBe(786);
    expect(dailyEnergyDeltaForRate(0.5, 'up')).toBeGreaterThan(
      dailyEnergyDeltaForRate(0.5, 'down'),
    );
  });

  it('subtracts the deficit from maintenance when losing', () => {
    // arrange & act & assert
    expect(
      budgetForRate({
        direction: 'down',
        rateKgPerWeek: 0.5,
        totalDailyEnergyExpenditure: 2232,
      }),
    ).toBe(1682);
  });

  it('adds the surplus to maintenance when gaining', () => {
    // arrange & act & assert
    expect(
      budgetForRate({
        direction: 'up',
        rateKgPerWeek: 0.25,
        totalDailyEnergyExpenditure: 2232,
      }),
    ).toBe(2625);
  });

  it('round-trips a budget back into the rate that produced it', () => {
    // arrange & act
    const rate = rateForDailyEnergyDelta(550, 'down');

    // assert - typing a budget and dragging the rate stay in agreement
    expect(rate).toBeCloseTo(0.5, 5);
  });
});

describe('the rate at which a deficit reaches the basal rate', () => {
  it('caps caution at the point the budget would fall below basal', () => {
    // arrange - 2232 maintenance against a 1440 basal rate leaves 792 kcal
    // act
    const caution = cautionRateKgPerWeek({
      basalMetabolicRate: 1440,
      currentWeightKg: 65,
      direction: 'down',
      totalDailyEnergyExpenditure: 2232,
    });

    // assert - 792 * 7 / 7700
    expect(caution).toBeCloseTo(0.72, 2);
  });

  it('scales the caution point with the client rather than fixing it', () => {
    // arrange & act - a smaller gap between basal and maintenance
    const caution = cautionRateKgPerWeek({
      basalMetabolicRate: 1400,
      currentWeightKg: 55,
      direction: 'down',
      totalDailyEnergyExpenditure: 1700,
    });

    // assert - only 300 kcal of room, so the caution point arrives far sooner
    expect(caution).toBeCloseTo(0.27, 2);
  });

  it('caps a losing rate at one and a half percent of bodyweight', () => {
    // arrange & act & assert
    expect(maxRateKgPerWeek(65, 'down')).toBeCloseTo(0.975, 3);
  });

  it('caps a gaining rate lower than a losing one', () => {
    // arrange & act & assert
    expect(maxRateKgPerWeek(65, 'up')).toBeLessThan(maxRateKgPerWeek(65, 'down'));
  });
});

describe('projecting when the client arrives', () => {
  it('counts the weeks the change takes at the chosen rate', () => {
    // arrange & act & assert - 5 kg at half a kilo a week
    expect(weeksToTarget(65, 60, 0.5)).toBe(10);
  });

  it('counts weeks the same when the target is above current', () => {
    // arrange & act & assert
    expect(weeksToTarget(65, 70, 0.25)).toBe(20);
  });

  it('has no end date when the rate is zero', () => {
    // arrange & act & assert - holding weight never 'arrives'
    expect(weeksToTarget(65, 65, 0)).toBeNull();
  });

  it('turns the week count into a date', () => {
    // arrange & act
    const end = projectedEndDate(new Date('2026-09-01T00:00:00Z'), 10);

    // assert - ten weeks is seventy days
    expect(end.toISOString().slice(0, 10)).toBe('2026-11-10');
  });
});
