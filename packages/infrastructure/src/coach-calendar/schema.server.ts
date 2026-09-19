import { appSchema } from "@eli-coach-platform/db";
import { sql } from "drizzle-orm";
import {
  check,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

const APPOINTMENT_KINDS = ["assessment_call"] as const;

export type AppointmentKind = (typeof APPOINTMENT_KINDS)[number];

export const COACH_TIME_RESERVATIONS_NO_OVERLAP =
  "coach_time_reservations_no_overlap";

export const coachTimeReservationsTable = appSchema.table(
  "coach_time_reservations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    appointmentKind: varchar("appointment_kind", {
      length: 32,
      enum: APPOINTMENT_KINDS,
    }).notNull(),
    appointmentId: uuid("appointment_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "coach_time_reservations_ends_after_start",
      sql`${table.endsAt} > ${table.startsAt}`,
    ),
    uniqueIndex("coach_time_reservations_appointment_unique").on(
      table.appointmentKind,
      table.appointmentId,
    ),
  ],
);
