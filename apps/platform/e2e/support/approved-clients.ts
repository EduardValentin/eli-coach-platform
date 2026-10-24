import type { CoachingSeed } from "@eli-coach-platform/domain/client-profile";
import type pg from "pg";

const SEED_COACHING = `
  update app.client_profiles
  set
    height_cm = $2,
    training_days_per_week = $3,
    session_minutes = $4,
    equipment = $5,
    training_place = $6,
    limitations = $7,
    level = $8,
    primary_goal = $9,
    goal_weight_kg = $10,
    activity_level = $11,
    cycle_mode = $12,
    dietary_restrictions = $13,
    coaching_seeded_at = $14,
    updated_at = $14
  where client_id = $1 and coaching_seeded_at is null
`;
const SEED_PREFERENCES = `
  update app.client_settings
  set
    preferred_check_in_weekday = $2,
    preferred_channel = $3,
    updated_at = $4
  where client_id = $1
`;

export async function recordCoachingSeeded(
  connection: pg.PoolClient,
  clientId: string,
  seed: CoachingSeed,
): Promise<void> {
  const { coaching, preferences } = seed;
  const seededAt = new Date();

  await connection.query(SEED_COACHING, [
    clientId,
    coaching.heightCm,
    coaching.trainingDays,
    coaching.sessionMinutes,
    JSON.stringify(coaching.equipment),
    coaching.trainingPlace,
    coaching.limitations,
    coaching.level,
    coaching.primaryGoal,
    coaching.goalWeightKg,
    coaching.activityLevel,
    coaching.cycleMode,
    coaching.dietaryRestrictions,
    seededAt,
  ]);
  await connection.query(SEED_PREFERENCES, [
    clientId,
    preferences.preferredCheckInWeekday,
    preferences.preferredChannel,
    seededAt,
  ]);
}
