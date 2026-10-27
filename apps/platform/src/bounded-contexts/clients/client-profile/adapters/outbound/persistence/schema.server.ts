import { appSchema } from "~/shared/database";
import { WEEKDAYS } from "~/bounded-contexts/scheduling/coach-schedule/domain/coach-availability";
import {
  ACTIVITY_LEVELS,
  CLIENT_LEVELS,
  CYCLE_MODES,
  PRIMARY_GOALS,
  PROGRESS_PHOTO_VIEWS,
  SESSION_MINUTE_OPTIONS,
  TRAINING_DAY_OPTIONS,
  TRAINING_PLACES,
  type ClientEquipment,
} from "~/bounded-contexts/clients/client-profile/domain/client-profile";
import type {
  OnboardingAnswersByForm,
  OnboardingFormId,
} from "~/bounded-contexts/clients/client-profile/domain/client-onboarding";
import {
  HEIGHT_UNITS,
  PREFERRED_CHANNELS,
  WEIGHT_UNITS,
} from "~/bounded-contexts/clients/client-profile/domain/client-settings";
import { sql, type SQL } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  numeric,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { clientsTable } from "~/bounded-contexts/clients/clients/adapters/outbound/persistence/schema.server";

export const clientMeasurementsTable = appSchema.table(
  "client_measurements",
  {
    id: uuid("id").primaryKey(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clientsTable.id),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
    weightKg: numeric("weight_kg", {
      precision: 5,
      scale: 2,
      mode: "number",
    }).notNull(),
    waistCm: numeric("waist_cm", {
      precision: 4,
      scale: 1,
      mode: "number",
    }).notNull(),
    hipsCm: numeric("hips_cm", { precision: 4, scale: 1, mode: "number" }),
    thighCm: numeric("thigh_cm", { precision: 4, scale: 1, mode: "number" }),
    armCm: numeric("arm_cm", { precision: 4, scale: 1, mode: "number" }),
  },
  (table) => [
    index("client_measurements_client_id_recorded_at_idx").on(
      table.clientId,
      table.recordedAt,
    ),
  ],
);

export const clientProfilesTable = appSchema.table(
  "client_profiles",
  {
    clientId: uuid("client_id")
      .primaryKey()
      .references(() => clientsTable.id),
    heightCm: numeric("height_cm", { precision: 4, scale: 1, mode: "number" }),
    trainingDaysPerWeek: smallint("training_days_per_week"),
    sessionMinutes: smallint("session_minutes"),
    equipment: jsonb("equipment").$type<ClientEquipment[]>(),
    trainingPlace: varchar("training_place", {
      enum: TRAINING_PLACES,
      length: 8,
    }),
    limitations: text("limitations"),
    level: varchar("level", { enum: CLIENT_LEVELS, length: 16 }),
    primaryGoal: text("primary_goal", { enum: PRIMARY_GOALS }),
    goalWeightKg: numeric("goal_weight_kg", {
      precision: 5,
      scale: 2,
      mode: "number",
    }),
    activityLevel: varchar("activity_level", {
      enum: ACTIVITY_LEVELS,
      length: 32,
    }),
    cycleMode: varchar("cycle_mode", { enum: CYCLE_MODES, length: 16 }),
    dietaryRestrictions: text("dietary_restrictions"),
    coachNotes: text("coach_notes"),
    coachingSeededAt: timestamp("coaching_seeded_at", { withTimezone: true }),
    progressPhotosConsentedAt: timestamp("progress_photos_consented_at", {
      withTimezone: true,
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    check(
      "client_profiles_training_days_per_week_check",
      sql`${table.trainingDaysPerWeek} in (${numberList(TRAINING_DAY_OPTIONS)})`,
    ),
    check(
      "client_profiles_session_minutes_check",
      sql`${table.sessionMinutes} in (${numberList(SESSION_MINUTE_OPTIONS)})`,
    ),
    check(
      "client_profiles_training_place_check",
      sql`${table.trainingPlace} in (${quotedList(TRAINING_PLACES)})`,
    ),
    check(
      "client_profiles_level_check",
      sql`${table.level} in (${quotedList(CLIENT_LEVELS)})`,
    ),
    check(
      "client_profiles_primary_goal_check",
      sql`${table.primaryGoal} in (${quotedList(PRIMARY_GOALS)})`,
    ),
    check(
      "client_profiles_activity_level_check",
      sql`${table.activityLevel} in (${quotedList(ACTIVITY_LEVELS)})`,
    ),
    check(
      "client_profiles_cycle_mode_check",
      sql`${table.cycleMode} in (${quotedList(CYCLE_MODES)})`,
    ),
  ],
);

export const clientProgressPhotosTable = appSchema.table(
  "client_progress_photos",
  {
    id: uuid("id").primaryKey(),
    entryId: uuid("entry_id")
      .notNull()
      .references(() => clientMeasurementsTable.id),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clientsTable.id),
    view: varchar("view", { enum: PROGRESS_PHOTO_VIEWS, length: 8 }).notNull(),
    storageKey: text("storage_key").notNull().unique(),
    keyId: text("key_id").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    unique("client_progress_photos_entry_id_view_unique").on(
      table.entryId,
      table.view,
    ),
    index("client_progress_photos_client_id_idx").on(table.clientId),
    check(
      "client_progress_photos_view_check",
      sql`${table.view} in (${quotedList(PROGRESS_PHOTO_VIEWS)})`,
    ),
  ],
);

export const clientSettingsTable = appSchema.table(
  "client_settings",
  {
    clientId: uuid("client_id")
      .primaryKey()
      .references(() => clientsTable.id),
    weightUnit: varchar("weight_unit", {
      enum: WEIGHT_UNITS,
      length: 8,
    }).notNull(),
    heightUnit: varchar("height_unit", {
      enum: HEIGHT_UNITS,
      length: 8,
    }).notNull(),
    preferredCheckInWeekday: varchar("preferred_check_in_weekday", {
      enum: WEEKDAYS,
      length: 9,
    }),
    preferredChannel: varchar("preferred_channel", {
      enum: PREFERRED_CHANNELS,
      length: 8,
    }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    check(
      "client_settings_weight_unit_check",
      sql`${table.weightUnit} in (${quotedList(WEIGHT_UNITS)})`,
    ),
    check(
      "client_settings_height_unit_check",
      sql`${table.heightUnit} in (${quotedList(HEIGHT_UNITS)})`,
    ),
    check(
      "client_settings_preferred_check_in_weekday_check",
      sql`${table.preferredCheckInWeekday} in (${quotedList(WEEKDAYS)})`,
    ),
    check(
      "client_settings_preferred_channel_check",
      sql`${table.preferredChannel} in (${quotedList(PREFERRED_CHANNELS)})`,
    ),
  ],
);

export const clientAvatarsTable = appSchema.table("client_avatars", {
  clientId: uuid("client_id")
    .primaryKey()
    .references(() => clientsTable.id),
  avatarId: uuid("avatar_id").notNull().unique(),
  storageKey: text("storage_key").notNull().unique(),
  keyId: text("key_id").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const clientOnboardingConstraints = {
  submissionPerClient: "client_onboarding_submissions_client_id_unique",
  openDetailRequestPerClient:
    "client_onboarding_detail_requests_open_per_client_unique",
} as const;

export const clientOnboardingDraftsTable = appSchema.table(
  "client_onboarding_drafts",
  {
    clientId: uuid("client_id")
      .primaryKey()
      .references(() => clientsTable.id),
    answers: jsonb("answers").$type<OnboardingAnswersByForm>().notNull(),
    currentFormIndex: integer("current_form_index").notNull(),
    specialCategoryConsentedAt: timestamp("special_category_consented_at", {
      withTimezone: true,
    }),
    disclaimerConsentedAt: timestamp("disclaimer_consented_at", {
      withTimezone: true,
    }),
    progressPhotosConsentedAt: timestamp("progress_photos_consented_at", {
      withTimezone: true,
    }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
);

export const clientOnboardingSubmissionsTable = appSchema.table(
  "client_onboarding_submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clientsTable.id),
    answers: jsonb("answers").$type<OnboardingAnswersByForm>().notNull(),
    specialCategoryConsentedAt: timestamp("special_category_consented_at", {
      withTimezone: true,
    }),
    disclaimerConsentedAt: timestamp("disclaimer_consented_at", {
      withTimezone: true,
    }),
    progressPhotosConsentedAt: timestamp("progress_photos_consented_at", {
      withTimezone: true,
    }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex(clientOnboardingConstraints.submissionPerClient).on(
      table.clientId,
    ),
  ],
);

export const clientOnboardingReviewsTable = appSchema.table(
  "client_onboarding_reviews",
  {
    clientId: uuid("client_id")
      .primaryKey()
      .references(() => clientsTable.id),
    openedAt: timestamp("opened_at", { withTimezone: true }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
  },
);

export const clientOnboardingDetailRequestsTable = appSchema.table(
  "client_onboarding_detail_requests",
  {
    id: uuid("id").primaryKey(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clientsTable.id),
    questionIds: jsonb("question_ids")
      .$type<{ formId: OnboardingFormId; fieldId: string }[]>()
      .notNull(),
    note: text("note").notNull(),
    askedAt: timestamp("asked_at", { withTimezone: true }).notNull(),
    answeredAt: timestamp("answered_at", { withTimezone: true }),
  },
  (table) => [
    index("client_onboarding_detail_requests_client_id_asked_at_idx").on(
      table.clientId,
      table.askedAt,
    ),
    uniqueIndex(clientOnboardingConstraints.openDetailRequestPerClient)
      .on(table.clientId)
      .where(sql`${table.answeredAt} is null`),
  ],
);

function quotedList(values: readonly string[]): SQL {
  return sql.raw(values.map((value) => `'${value}'`).join(", "));
}

function numberList(values: readonly number[]): SQL {
  return sql.raw(values.join(", "));
}
