import type { ActivityLevel, MetabolicSex } from "./client-onboarding-model";

// The sex constant is the only place the two Mifflin-St Jeor formulas differ.
const SEX_CONSTANT: Record<MetabolicSex, number> = {
  FEMALE: -161,
  MALE: 5,
};

export const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  SEDENTARY: 1.2,
  LIGHTLY_ACTIVE: 1.375,
  MODERATELY_ACTIVE: 1.55,
  VERY_ACTIVE: 1.725,
};

export function calculateBasalMetabolicRate(measurements: {
  ageYears: number;
  heightCm: number;
  sex: MetabolicSex;
  weightKg: number;
}): number {
  const { ageYears, heightCm, sex, weightKg } = measurements;

  return Math.round(
    10 * weightKg + 6.25 * heightCm - 5 * ageYears + SEX_CONSTANT[sex],
  );
}

export function calculateTotalDailyEnergyExpenditure(expenditure: {
  activityLevel: ActivityLevel;
  basalMetabolicRate: number;
}): number {
  return Math.round(
    expenditure.basalMetabolicRate *
      ACTIVITY_MULTIPLIER[expenditure.activityLevel],
  );
}

/**
 * Reads the date in UTC on both sides so a stored `YYYY-MM-DD` — which parses
 * as UTC midnight — is not shifted a day by the reader's timezone.
 */
export function ageOnDate(dateOfBirth: string, on: Date): number {
  const [birthYear, birthMonth, birthDay] = dateOfBirth.split("-").map(Number);
  const monthsElapsed = on.getUTCMonth() + 1 - birthMonth;
  const birthdayHasPassed =
    monthsElapsed > 0 || (monthsElapsed === 0 && on.getUTCDate() >= birthDay);

  return on.getUTCFullYear() - birthYear - (birthdayHasPassed ? 0 : 1);
}
