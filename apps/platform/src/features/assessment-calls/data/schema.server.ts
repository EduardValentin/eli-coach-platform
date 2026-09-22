import { appSchema } from "@eli-coach-platform/db";
import {
  VISITOR_GENDERS,
  VISITOR_PRIMARY_GOALS,
} from "@eli-coach-platform/domain/assessment-call";
import { sql } from "drizzle-orm";
import {
  char,
  check,
  date,
  index,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const assessmentCallsTable = appSchema.table(
  "assessment_calls",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    firstName: varchar("first_name", { length: 60 }).notNull(),
    lastName: varchar("last_name", { length: 60 }).notNull(),
    visitorEmail: varchar("visitor_email", { length: 320 }).notNull(),
    visitorNotes: text("visitor_notes"),
    dateOfBirth: date("date_of_birth", { mode: "string" }).notNull(),
    gender: varchar("gender", { enum: VISITOR_GENDERS, length: 32 }).notNull(),
    primaryGoal: varchar("primary_goal", {
      enum: VISITOR_PRIMARY_GOALS,
      length: 32,
    }).notNull(),
    country: char("country", { length: 2 }).notNull(),
    phone: varchar("phone", { length: 16 }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    visitorTimeZone: varchar("visitor_time_zone", { length: 64 }).notNull(),
    coachTimeZone: varchar("coach_time_zone", { length: 64 }).notNull(),
    bookedAt: timestamp("booked_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("assessment_calls_visitor_email_starts_at_idx").on(
      table.visitorEmail,
      table.startsAt,
    ),
    check(
      "assessment_calls_gender_check",
      sql`${table.gender} in (${quotedList(VISITOR_GENDERS)})`,
    ),
    check(
      "assessment_calls_primary_goal_check",
      sql`${table.primaryGoal} in (${quotedList(VISITOR_PRIMARY_GOALS)})`,
    ),
  ],
);

function quotedList(values: readonly string[]) {
  return sql.raw(values.map((value) => `'${value}'`).join(", "));
}
