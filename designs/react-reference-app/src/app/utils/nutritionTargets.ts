import type { GoalType } from '../context/TrainingContext';

export type MacroName = 'protein' | 'carbs' | 'fats';

export type MacroSplit = Record<MacroName, number>;

export const MACRO_NAMES: MacroName[] = ['protein', 'carbs', 'fats'];

export const MACRO_LABELS: Record<MacroName, string> = {
  protein: 'Protein',
  carbs: 'Carbs',
  fats: 'Fats',
};

export const MACRO_KCAL_PER_GRAM: Record<MacroName, number> = {
  protein: 4,
  carbs: 4,
  fats: 9,
};

/**
 * Which way a goal is allowed to move the client's weight. A fat-loss target
 * cannot sit above her current weight and a muscle-building target cannot sit
 * below it; maintenance and recomposition hold or drift down, never up.
 */
export type WeightDirection = 'down' | 'up' | 'either';

export const WEIGHT_DIRECTION_BY_GOAL: Record<GoalType, WeightDirection> = {
  'Fat Loss': 'down',
  'Maintenance': 'down',
  'Recomposition': 'down',
  'Muscle Building': 'up',
  'Strength': 'up',
  'Custom': 'either',
};

/**
 * Energy per kilogram of body mass, used to turn a weekly rate into a daily
 * calorie delta. Losing and gaining are deliberately asymmetric: a surplus buys
 * far less tissue than an equal deficit sheds, so treating them the same would
 * promise gains far faster than they arrive.
 *
 * PLACEHOLDER - 7700 for loss is the usual convention; the gain figure needs
 * Eli's sign-off. At 11000, a 500 kcal daily surplus predicts about 0.32 kg a
 * week, inside the usual lean-gain range.
 */
export const KCAL_PER_KG_LOST = 7700;
export const KCAL_PER_KG_GAINED = 11000;

/** PLACEHOLDER ceilings, as a percentage of bodyweight per week. */
export const MAX_RATE_PERCENT_BODYWEIGHT: Record<'down' | 'up', number> = {
  down: 1.5,
  up: 0.75,
};

/** PLACEHOLDER: where a gaining rate starts to be worth a second look. */
const CAUTION_GAIN_PERCENT_BODYWEIGHT = 0.5;

function kcalPerKg(direction: 'down' | 'up'): number {
  return direction === 'down' ? KCAL_PER_KG_LOST : KCAL_PER_KG_GAINED;
}

export function dailyEnergyDeltaForRate(
  rateKgPerWeek: number,
  direction: 'down' | 'up',
): number {
  return Math.round((rateKgPerWeek * kcalPerKg(direction)) / 7);
}

export function rateForDailyEnergyDelta(
  deltaKcal: number,
  direction: 'down' | 'up',
): number {
  return (deltaKcal * 7) / kcalPerKg(direction);
}

export function budgetForRate(plan: {
  direction: 'down' | 'up';
  rateKgPerWeek: number;
  totalDailyEnergyExpenditure: number;
}): number {
  const delta = dailyEnergyDeltaForRate(plan.rateKgPerWeek, plan.direction);
  return plan.direction === 'down'
    ? plan.totalDailyEnergyExpenditure - delta
    : plan.totalDailyEnergyExpenditure + delta;
}

export function maxRateKgPerWeek(
  currentWeightKg: number,
  direction: 'down' | 'up',
): number {
  return (currentWeightKg * MAX_RATE_PERCENT_BODYWEIGHT[direction]) / 100;
}

/**
 * The rate past which the coach should look twice. Losing is bounded by the
 * basal rate - the point where the budget would drop below what the body burns
 * at rest - which makes the caution point specific to this client rather than a
 * fixed percentage. Gaining has no equivalent floor, so it uses a flat band.
 */
export function cautionRateKgPerWeek(plan: {
  basalMetabolicRate: number;
  currentWeightKg: number;
  direction: 'down' | 'up';
  totalDailyEnergyExpenditure: number;
}): number {
  if (plan.direction === 'up') {
    return (plan.currentWeightKg * CAUTION_GAIN_PERCENT_BODYWEIGHT) / 100;
  }

  const largestDeficitAboveBasalRate = Math.max(
    plan.totalDailyEnergyExpenditure - plan.basalMetabolicRate,
    0,
  );
  return rateForDailyEnergyDelta(largestDeficitAboveBasalRate, 'down');
}

/** The granularity the rate slider moves in. */
export const RATE_STEP_KG = 0.05;

/**
 * PLACEHOLDER starting points, as a percentage of bodyweight per week. The
 * wizard opens here rather than at zero, so the coach lands on a defensible
 * pace and adjusts from it instead of building one from nothing.
 */
export const RECOMMENDED_RATE_PERCENT_BODYWEIGHT: Record<'down' | 'up', number> =
  {
    down: 0.5,
    up: 0.25,
  };

export function recommendedRateKgPerWeek(plan: {
  basalMetabolicRate: number;
  currentWeightKg: number;
  direction: 'down' | 'up';
  totalDailyEnergyExpenditure: number;
}): number {
  const fromBodyweight =
    (plan.currentWeightKg * RECOMMENDED_RATE_PERCENT_BODYWEIGHT[plan.direction]) /
    100;
  // Never open on a pace that would immediately warn the coach: a client whose
  // maintenance sits close to her basal rate gets a gentler starting point.
  const bounded = Math.min(fromBodyweight, cautionRateKgPerWeek(plan));

  // Land on a slider step so the thumb sits exactly on a notch.
  return Math.floor(bounded / RATE_STEP_KG) * RATE_STEP_KG;
}

export function weeksToTarget(
  currentWeightKg: number,
  targetWeightKg: number,
  rateKgPerWeek: number,
): number | null {
  if (rateKgPerWeek <= 0) return null;
  return Math.abs(targetWeightKg - currentWeightKg) / rateKgPerWeek;
}

export function projectedEndDate(from: Date, weeks: number): Date {
  const end = new Date(from);
  end.setDate(end.getDate() + Math.round(weeks * 7));
  return end;
}

export const RECOMMENDED_MACRO_SPLIT: Record<GoalType, MacroSplit> = {
  'Fat Loss': { protein: 35, carbs: 35, fats: 30 },
  'Muscle Building': { protein: 30, carbs: 45, fats: 25 },
  'Strength': { protein: 30, carbs: 45, fats: 25 },
  'Recomposition': { protein: 35, carbs: 35, fats: 30 },
  'Maintenance': { protein: 30, carbs: 40, fats: 30 },
  'Custom': { protein: 30, carbs: 40, fats: 30 },
};

export function macroCalories(dailyCalories: number, percent: number): number {
  return Math.round((dailyCalories * percent) / 100);
}

export function macroGrams(
  dailyCalories: number,
  percent: number,
  macro: MacroName,
): number {
  return Math.round(
    macroCalories(dailyCalories, percent) / MACRO_KCAL_PER_GRAM[macro],
  );
}

// How far the target sits from maintenance. `steep` is the band where a coach
// should look twice rather than a value the app refuses.
export type EnergyBalanceSeverity = 'balanced' | 'moderate' | 'steep';

export type EnergyBalance = {
  deltaKcal: number;
  percentOfTdee: number;
  severity: EnergyBalanceSeverity;
};

export function compareToMaintenance(
  dailyCalories: number,
  totalDailyEnergyExpenditure: number,
): EnergyBalance {
  const deltaKcal = dailyCalories - totalDailyEnergyExpenditure;
  const percentOfTdee = Math.round(
    (deltaKcal / totalDailyEnergyExpenditure) * 100,
  );
  const magnitude = Math.abs(percentOfTdee);

  return {
    deltaKcal,
    percentOfTdee,
    severity:
      magnitude <= 10 ? 'balanced' : magnitude <= 25 ? 'moderate' : 'steep',
  };
}
