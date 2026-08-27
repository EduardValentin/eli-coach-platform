import { sql } from "drizzle-orm";
import { check, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { appSchema } from "@eli-coach-platform/db";

export const accountsTable = appSchema.table(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authSubjectId: varchar("auth_subject_id", { length: 255 }).notNull().unique(),
    role: varchar("role", { length: 16 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    check("accounts_role_check", sql`${table.role} in ('USER', 'CLIENT', 'COACH')`),
  ],
);
