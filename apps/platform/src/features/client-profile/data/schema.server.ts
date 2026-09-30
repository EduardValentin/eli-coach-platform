import { appSchema } from "@eli-coach-platform/db";
import {
  HEIGHT_UNITS,
  WEIGHT_UNITS,
} from "@eli-coach-platform/domain/unit-preference";
import { sql, type SQL } from "drizzle-orm";
import {
  check,
  index,
  numeric,
  text,
  timestamp,
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
