import { useMemo, useState } from "react";

import {
  WEIGHT_DIRECTION_BY_GOAL,
  ageOnDate,
  budgetForRate,
  calculateBasalMetabolicRate,
  calculateTotalDailyEnergyExpenditure,
  cautionRateKgPerWeek,
  maxRateKgPerWeek,
  projectedEndDate,
  rateForDailyEnergyDelta,
  recommendedRateKgPerWeek,
  weeksToTarget,
  type ActivityLevel,
  type GoalType,
  type MetabolicSex,
} from "@eli-coach-platform/domain";

export const TOTAL_STEPS = 6;

// The goal precedes nutrition because the goal is what decides the calorie
// target and the split the next step opens on.
export const STEP_TITLES = [
  "Basic information",
  "Fitness & measurements",
  "Dietary restrictions",
  "Goals & focus",
  "Nutrition setup",
  "Review & send",
] as const;

export type OnboardClientFormState = {
  activityLevel: ActivityLevel;
  carbsPercent: string;
  coachNotes: string;
  dailyCalories: string;
  dateOfBirth: string;
  dietaryRestrictions: string;
  email: string;
  fatsPercent: string;
  firstName: string;
  goalType: GoalType | "";
  heightCm: string;
  lastName: string;
  proteinPercent: string;
  sex: MetabolicSex;
  targetWeightKg: string;
  weightKg: string;
};

export type FieldName = keyof OnboardClientFormState;
export type FieldErrors = Partial<Record<FieldName | "macroSplit", string>>;

export const EMPTY_FORM: OnboardClientFormState = {
  activityLevel: "SEDENTARY",
  carbsPercent: "",
  coachNotes: "",
  dailyCalories: "",
  dateOfBirth: "",
  dietaryRestrictions: "",
  email: "",
  fatsPercent: "",
  firstName: "",
  goalType: "",
  heightCm: "",
  lastName: "",
  proteinPercent: "",
  sex: "FEMALE",
  targetWeightKg: "",
  weightKg: "",
};

const NOTE_LIMIT = 2000;
const MIN_AGE = 16;
const MAX_AGE = 100;

// Deliberately loose: the server decides whether an address is real, so this
// only catches the obviously-not-an-email typo before a round trip.
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function toNumber(value: string): number | null {
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export function validateStep(
  step: number,
  form: OnboardClientFormState,
  now: Date,
): FieldErrors {
  const errors: FieldErrors = {};

  if (step === 1) {
    if (!form.firstName.trim()) errors.firstName = "First name is required.";
    if (!form.lastName.trim()) errors.lastName = "Last name is required.";
    if (!form.email.trim()) errors.email = "Email address is required.";
    else if (!EMAIL_SHAPE.test(form.email.trim()))
      errors.email = "Enter a valid email address.";

    if (!form.dateOfBirth) errors.dateOfBirth = "Date of birth is required.";
    else {
      const age = ageOnDate(form.dateOfBirth, now);
      if (age < MIN_AGE || age > MAX_AGE) {
        errors.dateOfBirth = `Age must be between ${MIN_AGE} and ${MAX_AGE}.`;
      }
    }
  }

  if (step === 2) {
    const height = toNumber(form.heightCm);
    if (height === null) errors.heightCm = "Height is required.";
    else if (height < 100 || height > 250)
      errors.heightCm = "Height must be between 100 and 250 cm.";

    const weight = toNumber(form.weightKg);
    if (weight === null) errors.weightKg = "Weight is required.";
    else if (weight < 30 || weight > 300)
      errors.weightKg = "Weight must be between 30 and 300 kg.";
  }

  if (step === 3 && form.dietaryRestrictions.length > NOTE_LIMIT) {
    errors.dietaryRestrictions = `Must be ${NOTE_LIMIT} characters or fewer.`;
  }

  if (step === 4) {
    if (!form.goalType) errors.goalType = "Goal type is required.";
    if (form.coachNotes.length > NOTE_LIMIT) {
      errors.coachNotes = `Must be ${NOTE_LIMIT} characters or fewer.`;
    }
  }

  if (step === 5) {
    const target = toNumber(form.targetWeightKg);
    const current = toNumber(form.weightKg);

    if (target === null) errors.targetWeightKg = "Target weight is required.";
    else if (target < 30 || target > 300)
      errors.targetWeightKg = "Target weight must be between 30 and 300 kg.";
    else if (current !== null && form.goalType) {
      const direction = WEIGHT_DIRECTION_BY_GOAL[form.goalType];
      if (direction === "DOWN" && target > current) {
        errors.targetWeightKg = `This goal cannot raise the weight above the current ${Math.round(current)} kg.`;
      }
      if (direction === "UP" && target < current) {
        errors.targetWeightKg = `This goal cannot lower the weight below the current ${Math.round(current)} kg.`;
      }
    }

    const calories = toNumber(form.dailyCalories);
    if (calories === null) errors.dailyCalories = "A daily budget is required.";
    else if (calories < 800 || calories > 6000)
      errors.dailyCalories = "Daily calories must be between 800 and 6,000.";

    const split = [
      ["proteinPercent", "Protein"],
      ["carbsPercent", "Carbs"],
      ["fatsPercent", "Fats"],
    ] as const;
    let total = 0;
    let complete = true;
    for (const [field, label] of split) {
      const percent = toNumber(form[field]);
      if (percent === null) {
        errors[field] = `${label} share is required.`;
        complete = false;
      } else if (percent < 0 || percent > 100) {
        errors[field] = `${label} must be between 0 and 100%.`;
        complete = false;
      } else total += percent;
    }
    if (complete && Math.round(total) !== 100) {
      errors.macroSplit = `The split must add up to 100%. It currently adds up to ${Math.round(total)}%.`;
    }
  }

  return errors;
}

export function useDerivedMetrics(form: OnboardClientFormState, now: Date) {
  return useMemo(() => {
    const height = toNumber(form.heightCm);
    const weight = toNumber(form.weightKg);
    const age = form.dateOfBirth ? ageOnDate(form.dateOfBirth, now) : null;

    if (height === null || weight === null || age === null) {
      return { basalMetabolicRate: null, totalDailyEnergyExpenditure: null };
    }

    const basalMetabolicRate = calculateBasalMetabolicRate({
      ageYears: age,
      heightCm: height,
      sex: form.sex,
      weightKg: weight,
    });

    return {
      basalMetabolicRate,
      totalDailyEnergyExpenditure: calculateTotalDailyEnergyExpenditure({
        activityLevel: form.activityLevel,
        basalMetabolicRate,
      }),
    };
  }, [
    form.activityLevel,
    form.dateOfBirth,
    form.heightCm,
    form.sex,
    form.weightKg,
    now,
  ]);
}

export function useOnboardClientForm() {
  const [form, setForm] = useState<OnboardClientFormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});

  const update = (patch: Partial<OnboardClientFormState>) =>
    setForm((previous) => ({ ...previous, ...patch }));

  return { errors, form, setErrors, setForm, update };
}

export type NutritionPlan = {
  budgetForRateKg: (rateKgPerWeek: number) => number | null;
  cautionRateKgPerWeek: number | null;
  endDate: Date | null;
  isBelowBasalRate: boolean;
  maxRateKgPerWeek: number | null;
  rateKgPerWeek: number;
  recommendedRateKgPerWeek: number | null;
  weeksToGoal: number | null;
  weightDirection: "DOWN" | "UP" | null;
};

/**
 * The typed budget stays the single source of truth and the rate is read back
 * off it, so moving the control and typing a figure cannot drift apart.
 */
export function deriveNutritionPlan(
  form: OnboardClientFormState,
  metrics: {
    basalMetabolicRate: number | null;
    totalDailyEnergyExpenditure: number | null;
  },
  now: Date,
): NutritionPlan {
  const current = toNumber(form.weightKg);
  const target = toNumber(form.targetWeightKg);
  const budget = toNumber(form.dailyCalories);
  const { basalMetabolicRate, totalDailyEnergyExpenditure } = metrics;

  const goalDirection = form.goalType
    ? WEIGHT_DIRECTION_BY_GOAL[form.goalType]
    : null;
  // A custom goal takes its direction from the target the coach actually set,
  // because nothing about the goal itself says which way she means to go.
  const weightDirection =
    goalDirection === null
      ? null
      : goalDirection !== "EITHER"
        ? goalDirection
        : target !== null && current !== null && target !== current
          ? target < current
            ? "DOWN"
            : "UP"
          : null;

  const deltaKcal =
    budget !== null && totalDailyEnergyExpenditure !== null
      ? Math.abs(budget - totalDailyEnergyExpenditure)
      : 0;
  const rateKgPerWeek = weightDirection
    ? rateForDailyEnergyDelta(deltaKcal, weightDirection)
    : 0;

  const weeksToGoal =
    current !== null && target !== null
      ? weeksToTarget(current, target, rateKgPerWeek)
      : null;

  const canPlan =
    weightDirection !== null &&
    current !== null &&
    basalMetabolicRate !== null &&
    totalDailyEnergyExpenditure !== null;

  return {
    budgetForRateKg: (rate) =>
      weightDirection && totalDailyEnergyExpenditure !== null
        ? budgetForRate({
            direction: weightDirection,
            rateKgPerWeek: rate,
            totalDailyEnergyExpenditure,
          })
        : null,
    cautionRateKgPerWeek: canPlan
      ? cautionRateKgPerWeek({
          basalMetabolicRate,
          currentWeightKg: current,
          direction: weightDirection,
          totalDailyEnergyExpenditure,
        })
      : null,
    endDate: weeksToGoal === null ? null : projectedEndDate(now, weeksToGoal),
    isBelowBasalRate:
      budget !== null && basalMetabolicRate !== null && budget < basalMetabolicRate,
    maxRateKgPerWeek:
      weightDirection && current !== null
        ? maxRateKgPerWeek(current, weightDirection)
        : null,
    rateKgPerWeek,
    recommendedRateKgPerWeek: canPlan
      ? recommendedRateKgPerWeek({
          basalMetabolicRate,
          currentWeightKg: current,
          direction: weightDirection,
          totalDailyEnergyExpenditure,
        })
      : null,
    weeksToGoal,
    weightDirection,
  };
}
