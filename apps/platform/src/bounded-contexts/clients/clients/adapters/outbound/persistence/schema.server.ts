import { appSchema } from "~/shared/database";
import {
  CLIENT_GENDERS,
  CLIENT_PRIMARY_GOALS,
  COACHING_STATUSES,
} from "~/bounded-contexts/clients/clients/domain/client";
import { sql, type SQL } from "drizzle-orm";
import {
  boolean,
  char,
  check,
  date,
  smallint,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { assessmentCallsTable } from "~/bounded-contexts/scheduling/assessment-calls/adapters/outbound/persistence/schema.server";

export const clientsConstraints = {
  clientPerCall: "clients_assessment_call_id_unique",
  clientPerAuthSubject: "clients_auth_subject_id_unique",
  clientPerAccountInvitation: "clients_account_invitation_id_unique",
} as const;

export const clientsTable = appSchema.table(
  "clients",
  {
    id: uuid("id").primaryKey(),
    assessmentCallId: uuid("assessment_call_id")
      .notNull()
      .references(() => assessmentCallsTable.id),
    firstName: varchar("first_name", { length: 60 }).notNull(),
    lastName: varchar("last_name", { length: 60 }).notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    dateOfBirth: date("date_of_birth", { mode: "string" }).notNull(),
    gender: varchar("gender", { enum: CLIENT_GENDERS, length: 32 }).notNull(),
    primaryGoal: varchar("primary_goal", {
      enum: CLIENT_PRIMARY_GOALS,
      length: 32,
    }).notNull(),
    country: char("country", { length: 2 }).notNull(),
    phone: varchar("phone", { length: 16 }),
    bookingTimeZone: varchar("booking_time_zone", { length: 64 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    authSubjectId: varchar("auth_subject_id", { length: 255 }),
    accountInvitationId: uuid("account_invitation_id"),
    welcomeSeenAt: timestamp("welcome_seen_at", { withTimezone: true }),
    onboardingSubmittedAt: timestamp("onboarding_submitted_at", {
      withTimezone: true,
    }),
    reviewOpenedAt: timestamp("review_opened_at", { withTimezone: true }),
    detailsRequestedAt: timestamp("details_requested_at", {
      withTimezone: true,
    }),
    detailsAnsweredAt: timestamp("details_answered_at", {
      withTimezone: true,
    }),
    answersApprovedAt: timestamp("answers_approved_at", {
      withTimezone: true,
    }),
    coachingStatus: varchar("coaching_status", {
      enum: COACHING_STATUSES,
      length: 16,
    })
      .notNull()
      .default("not-started"),
    coachingAccessEndsAt: timestamp("coaching_access_ends_at", {
      withTimezone: true,
    }),
    coachingRefundDue: boolean("coaching_refund_due").notNull().default(false),
    coachingBundleMonths: smallint("coaching_bundle_months"),
    coachingProgramStartsAt: timestamp("coaching_program_starts_at", {
      withTimezone: true,
    }),
    coachingPaidThrough: timestamp("coaching_paid_through", {
      withTimezone: true,
    }),
  },
  (table) => [
    uniqueIndex(clientsConstraints.clientPerCall).on(table.assessmentCallId),
    uniqueIndex(clientsConstraints.clientPerAuthSubject).on(
      table.authSubjectId,
    ),
    uniqueIndex(clientsConstraints.clientPerAccountInvitation).on(
      table.accountInvitationId,
    ),
    check(
      "clients_gender_check",
      sql`${table.gender} in (${quotedList(CLIENT_GENDERS)})`,
    ),
    check(
      "clients_primary_goal_check",
      sql`${table.primaryGoal} in (${quotedList(CLIENT_PRIMARY_GOALS)})`,
    ),
    check(
      "clients_coaching_status_check",
      sql`${table.coachingStatus} in (${quotedList(COACHING_STATUSES)})`,
    ),
  ],
);

function quotedList(values: readonly string[]): SQL {
  return sql.raw(values.map((value) => `'${value}'`).join(", "));
}
