import { appSchema } from "@eli-coach-platform/db";
import type {
  OnboardingAnswersByForm,
  OnboardingFormId,
} from "@eli-coach-platform/domain/client-onboarding";
import {
  HEIGHT_UNITS,
  WEIGHT_UNITS,
} from "@eli-coach-platform/domain/unit-preference";
import { sql, type SQL } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  numeric,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { clientsTable } from "~/features/coaching-sales/data/schema.server";

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

export const clientMeasurementsTable = appSchema.table(
  "client_measurements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
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

export const clientProfilesTable = appSchema.table("client_profiles", {
  clientId: uuid("client_id")
    .primaryKey()
    .references(() => clientsTable.id),
  heightCm: numeric("height_cm", { precision: 4, scale: 1, mode: "number" }),
  activityLevel: text("activity_level"),
  primaryGoal: text("primary_goal"),
  dietaryRestrictions: text("dietary_restrictions").notNull(),
  clientNotes: text("client_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const clientUnitPreferencesTable = appSchema.table(
  "client_unit_preferences",
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
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    check(
      "client_unit_preferences_weight_unit_check",
      sql`${table.weightUnit} in (${quotedList(WEIGHT_UNITS)})`,
    ),
    check(
      "client_unit_preferences_height_unit_check",
      sql`${table.heightUnit} in (${quotedList(HEIGHT_UNITS)})`,
    ),
  ],
);

function quotedList(values: readonly string[]): SQL {
  return sql.raw(values.map((value) => `'${value}'`).join(", "));
}
