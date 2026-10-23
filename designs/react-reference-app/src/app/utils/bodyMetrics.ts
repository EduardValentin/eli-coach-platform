import type { ActivityLevel } from '../domain/clientProfile';

// Mifflin-St Jeor defines a constant for two sexes only. The coach picks one
// because it selects which formula to apply, not because it describes the
// client's identity — she sets that herself during her own onboarding.
export type MetabolicSex = 'Female' | 'Male';

export const METABOLIC_SEXES: MetabolicSex[] = ['Female', 'Male'];

const SEX_CONSTANT: Record<MetabolicSex, number> = {
  Female: -161,
  Male: 5,
};

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  'Mostly sitting': 1.2,
  'Lightly active': 1.375,
  Active: 1.55,
  'Very active': 1.725,
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
      ACTIVITY_MULTIPLIERS[expenditure.activityLevel],
  );
}

// Reads the date in UTC on both sides so a stored `YYYY-MM-DD` — which parses
// as UTC midnight — is not shifted a day by the reader's timezone.
export function ageOnDate(dateOfBirth: string, on: Date): number {
  const [birthYear, birthMonth, birthDay] = dateOfBirth.split('-').map(Number);
  const monthsElapsed = on.getUTCMonth() + 1 - birthMonth;
  const birthdayHasPassed =
    monthsElapsed > 0 || (monthsElapsed === 0 && on.getUTCDate() >= birthDay);

  return on.getUTCFullYear() - birthYear - (birthdayHasPassed ? 0 : 1);
}
