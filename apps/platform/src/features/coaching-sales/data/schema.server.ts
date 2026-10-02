import { appSchema } from "@eli-coach-platform/db";
import {
  VISITOR_GENDERS,
  VISITOR_PRIMARY_GOALS,
} from "@eli-coach-platform/domain/assessment-call";
import {
  COACHING_BUNDLE_IDS,
  COACHING_BUNDLE_MONTHS,
  PRICE_TIERS,
} from "@eli-coach-platform/domain/coaching-bundle";
import {
  COACHING_SUBSCRIPTION_STATUSES,
  REFUND_REASONS,
  START_CHOICES,
} from "@eli-coach-platform/domain/coaching-subscription";
import type { PaymentLinkState } from "@eli-coach-platform/domain/payment-link";
import { sql, type SQL } from "drizzle-orm";
import {
  char,
  check,
  date,
  index,
  integer,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

import { assessmentCallsTable } from "~/features/assessment-calls/data/schema.server";

const PAYMENT_LINK_STATES = [
  "valid",
  "voided",
  "spent",
] as const satisfies readonly PaymentLinkState[];

export const coachingSalesConstraints = {
  clientPerCall: "clients_assessment_call_id_unique",
  clientPerAuthSubject: "clients_auth_subject_id_unique",
  invitationPerClient: "client_invitations_client_id_unique",
} as const;

export const paymentLinksTable = appSchema.table(
  "payment_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assessmentCallId: uuid("assessment_call_id")
      .notNull()
      .references(() => assessmentCallsTable.id),
    tokenSha256: varchar("token_sha256", { length: 64 }).notNull(),
    state: varchar("state", { enum: PAYMENT_LINK_STATES, length: 16 })
      .notNull()
      .default("valid"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  },
  (table) => [
    uniqueIndex("payment_links_token_sha256_unique").on(table.tokenSha256),
    index("payment_links_assessment_call_id_idx").on(table.assessmentCallId),
    check(
      "payment_links_token_sha256_hex",
      sql`${table.tokenSha256} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "payment_links_state_check",
      sql`${table.state} in (${quotedList(PAYMENT_LINK_STATES)})`,
    ),
    check(
      "payment_links_expires_after_creation",
      sql`${table.expiresAt} > ${table.createdAt}`,
    ),
  ],
);

export const checkoutSessionsTable = appSchema.table(
  "checkout_sessions",
  {
    id: varchar("id", { length: 255 }).primaryKey(),
    paymentLinkId: uuid("payment_link_id")
      .notNull()
      .references(() => paymentLinksTable.id),
    bundleId: varchar("bundle_id", {
      enum: COACHING_BUNDLE_IDS,
      length: 16,
    }).notNull(),
    tier: varchar("tier", { enum: PRICE_TIERS, length: 16 }).notNull(),
    amountCents: integer("amount_cents").notNull(),
    currency: char("currency", { length: 3 }).notNull(),
    startChoice: varchar("start_choice", {
      enum: START_CHOICES,
      length: 16,
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    expiredAt: timestamp("expired_at", { withTimezone: true }),
  },
  (table) => [
    index("checkout_sessions_payment_link_id_idx").on(table.paymentLinkId),
    bundleIdCheck("checkout_sessions", table.bundleId),
    tierCheck("checkout_sessions", table.tier),
    startChoiceCheck("checkout_sessions", table.startChoice),
    positiveAmountCheck("checkout_sessions", table.amountCents),
  ],
);

export const clientsTable = appSchema.table(
  "clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
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
  },
  (table) => [
    uniqueIndex(coachingSalesConstraints.clientPerCall).on(
      table.assessmentCallId,
    ),
    uniqueIndex(coachingSalesConstraints.clientPerAuthSubject).on(
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
  ],
);

export const clientInvitationsTable = appSchema.table(
  "client_invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
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
    uniqueIndex(coachingSalesConstraints.invitationPerClient).on(
      table.clientId,
    ),
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

export const coachingSubscriptionsTable = appSchema.table(
  "coaching_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clientsTable.id),
    assessmentCallId: uuid("assessment_call_id")
      .notNull()
      .references(() => assessmentCallsTable.id),
    bundleId: varchar("bundle_id", {
      enum: COACHING_BUNDLE_IDS,
      length: 16,
    }).notNull(),
    months: integer("months").notNull(),
    tier: varchar("tier", { enum: PRICE_TIERS, length: 16 }).notNull(),
    amountCents: integer("amount_cents").notNull(),
    currency: char("currency", { length: 3 }).notNull(),
    stripeCustomerId: varchar("stripe_customer_id", { length: 255 }).notNull(),
    stripeSubscriptionId: varchar("stripe_subscription_id", {
      length: 255,
    }).notNull(),
    stripeCheckoutSessionId: varchar("stripe_checkout_session_id", {
      length: 255,
    }).notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }).notNull(),
    startChoice: varchar("start_choice", {
      enum: START_CHOICES,
      length: 16,
    }).notNull(),
    status: varchar("status", {
      enum: COACHING_SUBSCRIPTION_STATUSES,
      length: 16,
    })
      .notNull()
      .default("not-started"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    accessEndsAt: timestamp("access_ends_at", { withTimezone: true }),
    paymentProblemSince: timestamp("payment_problem_since", {
      withTimezone: true,
    }),
    refundReason: varchar("refund_reason", {
      enum: REFUND_REASONS,
      length: 32,
    }),
    refundDueCents: integer("refund_due_cents"),
    refundDueBy: timestamp("refund_due_by", { withTimezone: true }),
    refundedCents: integer("refunded_cents"),
    refundedAt: timestamp("refunded_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("coaching_subscriptions_one_open_per_client")
      .on(table.clientId)
      .where(sql`${table.status} <> 'ended'`),
    uniqueIndex("coaching_subscriptions_stripe_subscription_id_unique").on(
      table.stripeSubscriptionId,
    ),
    uniqueIndex("coaching_subscriptions_stripe_checkout_session_id_unique").on(
      table.stripeCheckoutSessionId,
    ),
    index("coaching_subscriptions_assessment_call_id_idx").on(
      table.assessmentCallId,
    ),
    bundleIdCheck("coaching_subscriptions", table.bundleId),
    tierCheck("coaching_subscriptions", table.tier),
    startChoiceCheck("coaching_subscriptions", table.startChoice),
    positiveAmountCheck("coaching_subscriptions", table.amountCents),
    check(
      "coaching_subscriptions_months_check",
      sql`${table.months} in (${sql.raw(COACHING_BUNDLE_MONTHS.join(", "))})`,
    ),
    check(
      "coaching_subscriptions_status_check",
      sql`${table.status} in (${quotedList(COACHING_SUBSCRIPTION_STATUSES)})`,
    ),
    check(
      "coaching_subscriptions_refund_reason_check",
      sql`${table.refundReason} in (${quotedList(REFUND_REASONS)})`,
    ),
    check(
      "coaching_subscriptions_refund_complete",
      sql`(${table.refundReason} is null) = (${table.refundDueCents} is null) and (${table.refundReason} is null) = (${table.refundedCents} is null)`,
    ),
    check(
      "coaching_subscriptions_refund_amounts_not_negative",
      sql`${table.refundDueCents} >= 0 and ${table.refundedCents} >= 0`,
    ),
    check(
      "coaching_subscriptions_ending_has_access_end",
      sql`${table.status} not in ('cancelled', 'ended') or ${table.accessEndsAt} is not null`,
    ),
  ],
);

function bundleIdCheck(table: string, column: AnyPgColumn) {
  return check(
    `${table}_bundle_id_check`,
    sql`${column} in (${quotedList(COACHING_BUNDLE_IDS)})`,
  );
}

function tierCheck(table: string, column: AnyPgColumn) {
  return check(
    `${table}_tier_check`,
    sql`${column} in (${quotedList(PRICE_TIERS)})`,
  );
}

function startChoiceCheck(table: string, column: AnyPgColumn) {
  return check(
    `${table}_start_choice_check`,
    sql`${column} in (${quotedList(START_CHOICES)})`,
  );
}

function positiveAmountCheck(table: string, column: AnyPgColumn) {
  return check(`${table}_amount_cents_positive`, sql`${column} > 0`);
}

function quotedList(values: readonly string[]): SQL {
  return sql.raw(values.map((value) => `'${value}'`).join(", "));
}
