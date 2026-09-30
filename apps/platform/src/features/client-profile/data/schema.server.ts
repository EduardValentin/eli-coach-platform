import { appSchema } from "@eli-coach-platform/db";
import { PROGRESS_PHOTO_VIEWS } from "@eli-coach-platform/domain/client-profile";
import {
  HEIGHT_UNITS,
  WEIGHT_UNITS,
} from "@eli-coach-platform/domain/unit-preference";
import { sql, type SQL } from "drizzle-orm";
import {
  check,
  index,
  integer,
  numeric,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { clientsTable } from "~/features/coaching-sales/data/schema.server";

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
  progressPhotosConsentedAt: timestamp("progress_photos_consented_at", {
    withTimezone: true,
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const clientProgressPhotosTable = appSchema.table(
  "client_progress_photos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
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
