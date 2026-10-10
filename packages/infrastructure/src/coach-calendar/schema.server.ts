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

export type AppointmentKind = "assessment_call" | "check_in";

export const COACH_TIME_RESERVATIONS_NO_OVERLAP =
  "coach_time_reservations_no_overlap";

export const coachTimeReservationsTable = appSchema.table(
  "coach_time_reservations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    assessmentCallId: uuid("assessment_call_id"),
    checkInId: uuid("check_in_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "coach_time_reservations_ends_after_start",
      sql`${table.endsAt} > ${table.startsAt}`,
    ),
    check(
      "coach_time_reservations_one_appointment",
      sql`num_nonnulls(${table.assessmentCallId}, ${table.checkInId}) = 1`,
    ),
    uniqueIndex("coach_time_reservations_assessment_call_unique").on(
      table.assessmentCallId,
    ),
    uniqueIndex("coach_time_reservations_check_in_unique").on(table.checkInId),
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
