import { appSchema } from "@eli-coach-platform/db";
import {
  index,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const ASSESSMENT_CALLS_START_UNIQUE_INDEX =
  "assessment_calls_starts_at_unique";

export const assessmentCallsTable = appSchema.table(
  "assessment_calls",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    visitorName: varchar("visitor_name", { length: 120 }).notNull(),
    visitorEmail: varchar("visitor_email", { length: 320 }).notNull(),
    visitorNotes: text("visitor_notes"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    visitorTimeZone: varchar("visitor_time_zone", { length: 64 }).notNull(),
    coachTimeZone: varchar("coach_time_zone", { length: 64 }).notNull(),
    bookedAt: timestamp("booked_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex(ASSESSMENT_CALLS_START_UNIQUE_INDEX).on(table.startsAt),
    index("assessment_calls_visitor_email_starts_at_idx").on(
      table.visitorEmail,
      table.startsAt,
    ),
  ],
);
