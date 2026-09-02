import type { GoalType } from "./client-onboarding-model";

/**
 * Energy per kilogram of body mass, used to turn a weekly rate into a daily
 * calorie delta. Losing and gaining are deliberately asymmetric: a surplus buys
 * far less tissue than an equal deficit sheds, so treating them the same would
 * promise gains far faster than they arrive.
 *
 * PLACEHOLDER — 7700 for loss is the usual convention; the gain figure needs
 * the coach's sign-off. At 11000, a 500 kcal daily surplus predicts about
 * 0.32 kg a week, inside the usual lean-gain range.
 */
export const KCAL_PER_KG_LOST = 7700;
export const KCAL_PER_KG_GAINED = 11000;

/** The granularity the rate control moves in. */
export const RATE_STEP_KG = 0.05;

/** PLACEHOLDER ceilings, as a percentage of bodyweight per week. */
export const MAX_RATE_PERCENT_BODYWEIGHT: Record<"DOWN" | "UP", number> = {
  DOWN: 1.5,
  UP: 0.75,
};

/** PLACEHOLDER starting points, as a percentage of bodyweight per week. */
export const RECOMMENDED_RATE_PERCENT_BODYWEIGHT: Record<"DOWN" | "UP", number> =
  {
    DOWN: 0.5,
    UP: 0.25,
  };

/** PLACEHOLDER: where a gaining rate starts to be worth a second look. */
const CAUTION_GAIN_PERCENT_BODYWEIGHT = 0.5;

export const RECOMMENDED_MACRO_SPLIT: Record<
  GoalType,
  { carbsPercent: number; fatsPercent: number; proteinPercent: number }
> = {
  FAT_LOSS: { proteinPercent: 35, carbsPercent: 35, fatsPercent: 30 },
  MUSCLE_BUILDING: { proteinPercent: 30, carbsPercent: 45, fatsPercent: 25 },
  STRENGTH: { proteinPercent: 30, carbsPercent: 45, fatsPercent: 25 },
  RECOMPOSITION: { proteinPercent: 35, carbsPercent: 35, fatsPercent: 30 },
  MAINTENANCE: { proteinPercent: 30, carbsPercent: 40, fatsPercent: 30 },
  CUSTOM: { proteinPercent: 30, carbsPercent: 40, fatsPercent: 30 },
};

export const MACRO_KCAL_PER_GRAM = {
  carbs: 4,
  fats: 9,
  protein: 4,
} as const;

function kcalPerKg(direction: "DOWN" | "UP"): number {
  return direction === "DOWN" ? KCAL_PER_KG_LOST : KCAL_PER_KG_GAINED;
}

export function dailyEnergyDeltaForRate(
  rateKgPerWeek: number,
  direction: "DOWN" | "UP",
): number {
  return Math.round((rateKgPerWeek * kcalPerKg(direction)) / 7);
}

export function rateForDailyEnergyDelta(
  deltaKcal: number,
  direction: "DOWN" | "UP",
): number {
  return (deltaKcal * 7) / kcalPerKg(direction);
}

export function budgetForRate(plan: {
  direction: "DOWN" | "UP";
  rateKgPerWeek: number;
  totalDailyEnergyExpenditure: number;
}): number {
  const delta = dailyEnergyDeltaForRate(plan.rateKgPerWeek, plan.direction);
  return plan.direction === "DOWN"
    ? plan.totalDailyEnergyExpenditure - delta
    : plan.totalDailyEnergyExpenditure + delta;
}

export function maxRateKgPerWeek(
  currentWeightKg: number,
  direction: "DOWN" | "UP",
): number {
  return (currentWeightKg * MAX_RATE_PERCENT_BODYWEIGHT[direction]) / 100;
}

/**
 * The rate past which the coach should look twice. Losing is bounded by the
 * basal rate — the point where the budget would drop below what the body burns
 * at rest — which makes the caution point specific to this client rather than a
 * fixed percentage. Gaining has no equivalent floor, so it uses a flat band.
 */
export function cautionRateKgPerWeek(plan: {
  basalMetabolicRate: number;
  currentWeightKg: number;
  direction: "DOWN" | "UP";
  totalDailyEnergyExpenditure: number;
}): number {
  if (plan.direction === "UP") {
    return (plan.currentWeightKg * CAUTION_GAIN_PERCENT_BODYWEIGHT) / 100;
  }

  const largestDeficitAboveBasalRate = Math.max(
    plan.totalDailyEnergyExpenditure - plan.basalMetabolicRate,
    0,
  );
  return rateForDailyEnergyDelta(largestDeficitAboveBasalRate, "DOWN");
}

export function recommendedRateKgPerWeek(plan: {
  basalMetabolicRate: number;
  currentWeightKg: number;
  direction: "DOWN" | "UP";
  totalDailyEnergyExpenditure: number;
}): number {
  const fromBodyweight =
    (plan.currentWeightKg *
      RECOMMENDED_RATE_PERCENT_BODYWEIGHT[plan.direction]) /
    100;
  // Never open on a pace that would immediately warn the coach: a client whose
  // maintenance sits close to her basal rate gets a gentler starting point.
  const bounded = Math.min(fromBodyweight, cautionRateKgPerWeek(plan));

  // Land on a control step so the thumb sits exactly on a notch.
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

export function macroCalories(dailyCalories: number, percent: number): number {
  return Math.round((dailyCalories * percent) / 100);
}

export function macroGrams(
  dailyCalories: number,
  percent: number,
  macro: keyof typeof MACRO_KCAL_PER_GRAM,
): number {
  return Math.round(
    macroCalories(dailyCalories, percent) / MACRO_KCAL_PER_GRAM[macro],
  );
}
