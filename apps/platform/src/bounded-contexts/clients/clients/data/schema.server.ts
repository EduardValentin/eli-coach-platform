import { appSchema } from "~/shared/database";
import {
  VISITOR_GENDERS,
  VISITOR_PRIMARY_GOALS,
} from "~/bounded-contexts/scheduling/assessment-calls/domain/assessment-call";
import { COACHING_STATUSES } from "~/bounded-contexts/clients/clients/domain/client";
import { sql, type SQL } from "drizzle-orm";
import {
  boolean,
  char,
  check,
  date,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { assessmentCallsTable } from "~/bounded-contexts/scheduling/assessment-calls/data/schema.server";

export const clientsConstraints = {
  clientPerCall: "clients_assessment_call_id_unique",
  clientPerAuthSubject: "clients_auth_subject_id_unique",
  invitationPerClient: "client_invitations_client_id_unique",
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
    gender: varchar("gender", { enum: VISITOR_GENDERS, length: 32 }).notNull(),
    primaryGoal: varchar("primary_goal", {
      enum: VISITOR_PRIMARY_GOALS,
      length: 32,
    }).notNull(),
    country: char("country", { length: 2 }).notNull(),
    phone: varchar("phone", { length: 16 }),
    bookingTimeZone: varchar("booking_time_zone", { length: 64 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    authSubjectId: varchar("auth_subject_id", { length: 255 }),
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
    check(
      "clients_gender_check",
      sql`${table.gender} in (${quotedList(VISITOR_GENDERS)})`,
    ),
    check(
      "clients_primary_goal_check",
      sql`${table.primaryGoal} in (${quotedList(VISITOR_PRIMARY_GOALS)})`,
    ),
    check(
      "clients_coaching_status_check",
      sql`${table.coachingStatus} in (${quotedList(COACHING_STATUSES)})`,
    ),
  ],
);

export const clientInvitationsTable = appSchema.table(
  "client_invitations",
  {
    id: uuid("id").primaryKey(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clientsTable.id),
    email: varchar("email", { length: 320 }).notNull(),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    acceptedByAuthSubjectId: varchar("accepted_by_auth_subject_id", {
      length: 255,
    }),
    providerInvitationId: varchar("provider_invitation_id", { length: 255 }),
    providerInvitationUrl: text("provider_invitation_url"),
    emailSentAt: timestamp("email_sent_at", { withTimezone: true }),
    emailDeliveryFailedAt: timestamp("email_delivery_failed_at", {
      withTimezone: true,
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex(clientsConstraints.invitationPerClient).on(table.clientId),
    uniqueIndex("client_invitations_token_hash_unique").on(table.tokenHash),
    check(
      "client_invitations_token_hash_hex",
      sql`${table.tokenHash} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "client_invitations_expires_after_sending",
      sql`${table.expiresAt} > ${table.sentAt}`,
    ),
    check(
      "client_invitations_used_by_a_subject",
      sql`(${table.usedAt} is null) = (${table.acceptedByAuthSubjectId} is null)`,
    ),
    check(
      "client_invitations_provider_complete",
      sql`(${table.providerInvitationId} is null) = (${table.providerInvitationUrl} is null)`,
    ),
  ],
);

function quotedList(values: readonly string[]): SQL {
  return sql.raw(values.map((value) => `'${value}'`).join(", "));
}
