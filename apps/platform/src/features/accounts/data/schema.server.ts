import { date, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { appSchema } from "@eli-coach-platform/db";
import type { AccountRole, Gender } from "@eli-coach-platform/domain";

const accountRoleValues = ["USER", "CLIENT", "COACH"] as const;

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
type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
  ? true
  : false;
type AssertTrue<T extends true> = T;
type AccountRoleValuesMatchDomain = AssertTrue<
  Equals<(typeof accountRoleValues)[number], AccountRole>
>;

export const accountRoleEnum = appSchema.enum("account_role", accountRoleValues);

export const accountsTable = appSchema.table("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  authSubjectId: varchar("auth_subject_id", { length: 255 }).notNull().unique(),
  role: accountRoleEnum("role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

const genderValues = [
  "FEMALE",
  "MALE",
  "NON_BINARY",
  "PREFER_NOT_TO_SAY",
] as const;

type GenderValuesMatchDomain = AssertTrue<
  Equals<(typeof genderValues)[number], Gender>
>;

export const genderEnum = appSchema.enum("gender", genderValues);

/**
 * A person, separate from the account they sign in with. Every role can have
 * one: a registered user, a client, the coach. `accountId` is null until the
 * account exists — the coach fills a client's profile in when she invites her,
 * which is before that client has signed in for the first time.
 */
export const profilesTable = appSchema.table(
  "profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id").references(() => accountsTable.id),
    firstName: varchar("first_name", { length: 100 }).notNull(),
    lastName: varchar("last_name", { length: 100 }).notNull(),
    // Stored rather than an age, which would silently go stale: every figure
    // derived from it is recomputed against the day it is needed.
    dateOfBirth: date("date_of_birth").notNull(),
    gender: genderEnum("gender").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("profiles_account_id_unique").on(table.accountId)],
);
