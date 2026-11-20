import { appSchema } from "~/shared/database";
import {
  CLIENT_LEVELS,
  PROGRAM_LANGUAGES,
  VERSION_STATUSES,
} from "~/bounded-contexts/programs/training-programs/domain/program";
import { sql, type SQL } from "drizzle-orm";
import {
  check,
  integer,
  jsonb,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { clientsTable } from "~/bounded-contexts/clients/clients/adapters/outbound/persistence/schema.server";

export const programsConstraints = {
  programPerClient: "programs_client_id_unique",
  draftPerProgram: "program_versions_draft_per_program_unique",
} as const;

export const programsTable = appSchema.table(
  "programs",
  {
    id: uuid("id").primaryKey(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clientsTable.id),
    goal: text("goal").notNull(),
    level: varchar("level", { enum: CLIENT_LEVELS, length: 16 }).notNull(),
    language: varchar("language", {
      enum: PROGRAM_LANGUAGES,
      length: 2,
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    unique(programsConstraints.programPerClient).on(table.clientId),
    check(
      "programs_goal_check",
      sql`${table.goal} = btrim(${table.goal}) and ${table.goal} <> ''`,
    ),
    check(
      "programs_level_check",
      sql`${table.level} in (${quotedList(CLIENT_LEVELS)})`,
    ),
    check(
      "programs_language_check",
      sql`${table.language} in (${quotedList(PROGRAM_LANGUAGES)})`,
    ),
  ],
);

export const programVersionsTable = appSchema.table(
  "program_versions",
  {
    programId: uuid("program_id")
      .notNull()
      .references(() => programsTable.id),
    number: integer("number").notNull(),
    status: varchar("status", { enum: VERSION_STATUSES, length: 16 }).notNull(),
    content: jsonb("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.programId, table.number] }),
    uniqueIndex(programsConstraints.draftPerProgram)
      .on(table.programId)
      .where(sql`${table.status} = 'draft'`),
    check("program_versions_number_check", sql`${table.number} >= 1`),
    check(
      "program_versions_status_check",
      sql`${table.status} in (${quotedList(VERSION_STATUSES)})`,
    ),
    check(
      "program_versions_content_check",
      sql`jsonb_typeof(${table.content}) = 'object'`,
    ),
  ],
);

function quotedList(values: readonly string[]): SQL {
  return sql.raw(values.map((value) => `'${value}'`).join(", "));
}
