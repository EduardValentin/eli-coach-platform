import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { appSchema } from "@eli-coach-platform/db";

/** `auth_subject_id` stays nullable for accounts that predate an identity. */
export const accountsTable = appSchema.table(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authSubjectId: text("auth_subject_id"),
    role: varchar("role", { length: 16 }).notNull().default("USER"),
    deleted: boolean("deleted").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("accounts_auth_subject_id_unique").on(table.authSubjectId),
    check(
      "accounts_role_check",
      sql`${table.role} in ('USER', 'CLIENT', 'COACH')`,
    ),
  ],
);
