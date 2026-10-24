import {
  SESSION_MINUTE_OPTIONS,
  TRAINING_DAY_OPTIONS,
  type CoachingFactsSnapshot,
} from "@eli-coach-platform/domain/client-profile";

import { clientProfilesTable } from "~/features/client-profile/data/schema.server";

type CoachingColumns = Pick<
  typeof clientProfilesTable.$inferSelect,
  | "heightCm"
  | "trainingDaysPerWeek"
  | "sessionMinutes"
  | "equipment"
  | "trainingPlace"
  | "limitations"
  | "level"
  | "primaryGoal"
  | "goalWeightKg"
  | "activityLevel"
  | "cycleMode"
  | "dietaryRestrictions"
>;

export const COACHING_COLUMNS = {
  heightCm: clientProfilesTable.heightCm,
  trainingDaysPerWeek: clientProfilesTable.trainingDaysPerWeek,
  sessionMinutes: clientProfilesTable.sessionMinutes,
  equipment: clientProfilesTable.equipment,
  trainingPlace: clientProfilesTable.trainingPlace,
  limitations: clientProfilesTable.limitations,
  level: clientProfilesTable.level,
  primaryGoal: clientProfilesTable.primaryGoal,
  goalWeightKg: clientProfilesTable.goalWeightKg,
  activityLevel: clientProfilesTable.activityLevel,
  cycleMode: clientProfilesTable.cycleMode,
  dietaryRestrictions: clientProfilesTable.dietaryRestrictions,
};

export function coachingColumnsOf(
  coaching: CoachingFactsSnapshot,
): CoachingColumns {
  const { trainingDays, ...facts } = coaching;

  return { ...facts, trainingDaysPerWeek: trainingDays };
}

export function sharedColumnsOf(
  coaching: CoachingFactsSnapshot,
): Pick<
  CoachingColumns,
  | "heightCm"
  | "trainingDaysPerWeek"
  | "sessionMinutes"
  | "equipment"
  | "trainingPlace"
  | "limitations"
> {
  return {
    heightCm: coaching.heightCm,
    trainingDaysPerWeek: coaching.trainingDays,
    sessionMinutes: coaching.sessionMinutes,
    equipment: coaching.equipment,
    trainingPlace: coaching.trainingPlace,
    limitations: coaching.limitations,
  };
}

export function coachingOf(row: CoachingColumns): CoachingFactsSnapshot {
  const trainingDays = TRAINING_DAY_OPTIONS.find(
    (days) => days === row.trainingDaysPerWeek,
  );
  const sessionMinutes = SESSION_MINUTE_OPTIONS.find(
    (minutes) => minutes === row.sessionMinutes,
  );
  const { level, cycleMode, equipment, limitations, dietaryRestrictions } = row;

  if (
    trainingDays === undefined ||
    sessionMinutes === undefined ||
    level === null ||
    cycleMode === null ||
    equipment === null ||
    limitations === null ||
    dietaryRestrictions === null
  ) {
    throw new Error("A seeded client profile is missing a coaching fact.");
  }

  return {
    heightCm: row.heightCm,
    trainingDays,
    sessionMinutes,
    equipment,
    trainingPlace: row.trainingPlace,
    limitations,
    level,
    primaryGoal: row.primaryGoal,
    goalWeightKg: row.goalWeightKg,
    activityLevel: row.activityLevel,
    cycleMode,
    dietaryRestrictions,
  };
}
