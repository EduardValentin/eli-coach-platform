import { sql } from "drizzle-orm";
import {
  check,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { appSchema } from "~/shared/database";
import type { AccountRole } from "~/bounded-contexts/access/accounts/domain/account";

const accountRoleValues = ["CLIENT", "COACH"] as const;

// Distributive conditional-type equality check: catches drift in either
// direction between `accountRoleValues` (what the Postgres enum will hold)
// and the domain's `AccountRole` union. A literal array can't be derived
// from a type, so the two have to be kept in sync by hand; this assertion
// makes that drift a typecheck failure instead of a silent runtime gap.
//
// Purely type-level: `AssertTrue`'s constraint fails to typecheck the moment
// `Equals<…>` stops evaluating to `true`, so the guard needs no runtime
// value (and therefore no `void`-suppressed unused-variable workaround) to
// stay live.
type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
type AssertTrue<T extends true> = T;
type AccountRoleValuesMatchDomain = AssertTrue<
  Equals<(typeof accountRoleValues)[number], AccountRole>
>;

export const accountRoleEnum = appSchema.enum(
  "account_role",
  accountRoleValues,
);

export const accountsTable = appSchema.table("accounts", {
  id: uuid("id").primaryKey(),
  authSubjectId: varchar("auth_subject_id", { length: 255 }).notNull().unique(),
  role: accountRoleEnum("role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const accountInvitationsTable = appSchema.table(
  "account_invitations",
  {
    id: uuid("id").primaryKey(),
    email: varchar("email", { length: 320 }).notNull(),
    role: accountRoleEnum("role").notNull(),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    providerInvitationId: varchar("provider_invitation_id", { length: 255 }),
    providerInvitationUrl: text("provider_invitation_url"),
    emailSentAt: timestamp("email_sent_at", { withTimezone: true }),
    emailDeliveryFailedAt: timestamp("email_delivery_failed_at", {
      withTimezone: true,
    }),
    acceptedByAuthSubjectId: varchar("accepted_by_auth_subject_id", {
      length: 255,
    }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("account_invitations_one_accepted_per_auth_subject")
      .on(table.acceptedByAuthSubjectId)
      .where(sql`${table.acceptedByAuthSubjectId} is not null`),
    uniqueIndex("account_invitations_token_hash_unique").on(table.tokenHash),
    check("account_invitations_role_check", sql`${table.role} = 'CLIENT'`),
    check(
      "account_invitations_token_hash_hex",
      sql`${table.tokenHash} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "account_invitations_expires_after_sending",
      sql`${table.expiresAt} > ${table.sentAt}`,
    ),
    check(
      "account_invitations_accepted_by_a_subject",
      sql`(${table.acceptedAt} is null) = (${table.acceptedByAuthSubjectId} is null)`,
    ),
    check(
      "account_invitations_provider_complete",
      sql`(${table.providerInvitationId} is null) = (${table.providerInvitationUrl} is null)`,
    ),
  ],
);
