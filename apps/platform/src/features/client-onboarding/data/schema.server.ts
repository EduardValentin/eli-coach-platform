import { sql } from "drizzle-orm";
import {
  date,
  integer,
  numeric,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { appSchema } from "@eli-coach-platform/db";
import type {
  ActivityLevel,
  GoalStatus,
  GoalType,
} from "@eli-coach-platform/domain";

import { profilesTable } from "~/features/accounts/data/schema.server";

// Distributive conditional-type equality check, mirroring the one beside
// `accountsTable`: it catches drift in either direction between what the
// Postgres enum will hold and the domain's union.
type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B
  ? 1
  : 2
  ? true
  : false;
type AssertTrue<T extends true> = T;

const activityLevelValues = [
  "SEDENTARY",
  "LIGHTLY_ACTIVE",
  "MODERATELY_ACTIVE",
  "VERY_ACTIVE",
] as const;
type ActivityLevelValuesMatchDomain = AssertTrue<
  Equals<(typeof activityLevelValues)[number], ActivityLevel>
>;

const goalTypeValues = [
  "MUSCLE_BUILDING",
  "FAT_LOSS",
  "STRENGTH",
  "RECOMPOSITION",
  "MAINTENANCE",
  "CUSTOM",
] as const;
type GoalTypeValuesMatchDomain = AssertTrue<
  Equals<(typeof goalTypeValues)[number], GoalType>
>;

const goalStatusValues = ["ACTIVE", "COMPLETED"] as const;
type GoalStatusValuesMatchDomain = AssertTrue<
  Equals<(typeof goalStatusValues)[number], GoalStatus>
>;

export const activityLevelEnum = appSchema.enum(
  "activity_level",
  activityLevelValues,
);
export const goalTypeEnum = appSchema.enum("goal_type", goalTypeValues);
export const goalStatusEnum = appSchema.enum("goal_status", goalStatusValues);

/**
 * The coaching relationship, holding only what stays true across it. Anything
 * that moves — her weight, her targets, her goal — lives in its own table so it
 * carries a history rather than being overwritten.
 */
export const clientsTable = appSchema.table(
  "clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profilesTable.id),
    email: varchar("email", { length: 320 }).notNull(),
    // Uniqueness rides on the normalized form: raw addresses differ by case
    // and surrounding space while naming the same inbox.
    normalizedEmail: varchar("normalized_email", { length: 320 }).notNull(),
    dietaryRestrictions: varchar("dietary_restrictions", { length: 2000 }),
    coachNotes: varchar("coach_notes", { length: 2000 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("clients_normalized_email_unique").on(table.normalizedEmail),
    uniqueIndex("clients_profile_id_unique").on(table.profileId),
  ],
);

/**
 * A weigh-in, appended rather than updated. The starting weight is the earliest
 * row and the current weight the latest, so neither needs its own column. The
 * derived figures are stored rather than recomputed: age moves and the formula
 * may change, so a past measurement could not be reproduced from today's
 * inputs — the stored number is the one the client was actually given.
 */
export const clientMeasurementsTable = appSchema.table(
  "client_measurements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clientsTable.id),
    heightCm: numeric("height_cm", { precision: 5, scale: 1 }).notNull(),
    weightKg: numeric("weight_kg", { precision: 5, scale: 1 }).notNull(),
    activityLevel: activityLevelEnum("activity_level").notNull(),
    basalMetabolicRate: integer("basal_metabolic_rate").notNull(),
    totalDailyEnergyExpenditure: integer(
      "total_daily_energy_expenditure",
    ).notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("client_measurements_client_recorded_at_unique").on(
      table.clientId,
      table.recordedAt,
    ),
  ],
);

export const clientGoalsTable = appSchema.table(
  "client_goals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clientsTable.id),
    type: goalTypeEnum("type").notNull(),
    status: goalStatusEnum("status").notNull().default("ACTIVE"),
    targetWeightKg: numeric("target_weight_kg", {
      precision: 5,
      scale: 1,
    }).notNull(),
    startedOn: date("started_on").notNull(),
    endedOn: date("ended_on"),
  },
  (table) => [
    // One goal at a time. Completed goals stay for history, so the constraint
    // is partial rather than a plain unique on `client_id`.
    uniqueIndex("client_goals_one_active_per_client")
      .on(table.clientId)
      .where(sql`${table.status} = 'ACTIVE'`),
  ],
);

/**
 * Appended, not updated: revising a client's targets keeps what she was working
 * to before, which check-ins and progress reviews need. Grams are not stored —
 * they follow from the calorie budget and the percentages.
 */
export const nutritionTargetsTable = appSchema.table("nutrition_targets", {
  id: uuid("id").primaryKey().defaultRandom(),
  goalId: uuid("goal_id")
    .notNull()
    .references(() => clientGoalsTable.id),
  dailyCalories: integer("daily_calories").notNull(),
  proteinPercent: integer("protein_percent").notNull(),
  carbsPercent: integer("carbs_percent").notNull(),
  fatsPercent: integer("fats_percent").notNull(),
  effectiveFrom: timestamp("effective_from", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const clientInvitationsTable = appSchema.table(
  "client_invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clientsTable.id),
    // Only the hash is kept, so a leaked database cannot accept an invitation.
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 128 }).notNull(),
    payloadDigest: varchar("payload_digest", { length: 64 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("client_invitations_idempotency_key_unique").on(
      table.idempotencyKey,
    ),
    // Re-inviting replaces the pending link rather than adding a second one.
    uniqueIndex("client_invitations_one_pending_per_client")
      .on(table.clientId)
      .where(sql`${table.acceptedAt} is null`),
  ],
);
