import { timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { appSchema } from "@eli-coach-platform/db";
import type { AccountRole } from "@eli-coach-platform/domain";

const accountRoleValues = ["USER", "CLIENT", "COACH"] as const;

// Distributive conditional-type equality check: catches drift in either
// direction between `accountRoleValues` (what the Postgres enum will hold)
// and the domain's `AccountRole` union. A literal array can't be derived
// from a type, so the two have to be kept in sync by hand; this assertion
// makes that drift a typecheck failure instead of a silent runtime gap.
type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
  ? true
  : false;
type AccountRoleValuesMatchDomain = Equals<(typeof accountRoleValues)[number], AccountRole>;
const accountRoleValuesMatchDomain: AccountRoleValuesMatchDomain = true;
void accountRoleValuesMatchDomain;

export const accountRoleEnum = appSchema.enum("account_role", accountRoleValues);

export const accountsTable = appSchema.table("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  authSubjectId: varchar("auth_subject_id", { length: 255 }).notNull().unique(),
  role: accountRoleEnum("role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
