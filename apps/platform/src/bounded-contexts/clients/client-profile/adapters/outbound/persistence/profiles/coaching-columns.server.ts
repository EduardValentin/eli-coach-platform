import type { CoachingFactsSnapshot } from "~/bounded-contexts/clients/client-profile/domain/client-profile";

import { clientProfilesTable } from "~/bounded-contexts/clients/client-profile/adapters/outbound/persistence/schema.server";

export type CoachingColumns = Pick<
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

export function coachingColumnsOf(
  coaching: CoachingFactsSnapshot,
): CoachingColumns {
  const { trainingDays, ...facts } = coaching;

  return { ...facts, trainingDaysPerWeek: trainingDays };
}
