import { appSchema } from "@eli-coach-platform/db";
import type { OnboardingAnswersByForm } from "@eli-coach-platform/domain/client-onboarding";
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
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { clientsTable } from "~/features/coaching-sales/data/schema.server";

export const clientOnboardingConstraints = {
  submissionPerClient: "client_onboarding_submissions_client_id_unique",
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
