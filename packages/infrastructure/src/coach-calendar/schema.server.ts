import { appSchema } from "@eli-coach-platform/db";
import { sql } from "drizzle-orm";
import {
  check,
  smallint,
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

export const SINGLETON_COACH_AVAILABILITY_ID = 1;

export const coachAvailabilityTable = appSchema.table(
  "coach_availability",
  {
    id: smallint("id").primaryKey(),
    timeZone: varchar("time_zone", { length: 64 }).notNull(),
    weekdays: varchar("weekdays", { length: 9 }).array().notNull(),
    startHour: smallint("start_hour").notNull(),
    endHour: smallint("end_hour").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    check("coach_availability_is_singleton", sql`${table.id} = 1`),
    check(
      "coach_availability_has_a_weekday",
      sql`cardinality(${table.weekdays}) >= 1`,
    ),
    check(
      "coach_availability_hours_in_range",
      sql`${table.startHour} >= 0 and ${table.startHour} < ${table.endHour} and ${table.endHour} <= 24`,
    ),
  ],
);
