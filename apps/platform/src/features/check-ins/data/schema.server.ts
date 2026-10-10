import { appSchema } from "@eli-coach-platform/db";
import {
  CHECK_IN_KINDS,
  CHECK_IN_PARTIES,
  MAX_CHECK_IN_NOTE_LENGTH,
  RECORDED_CHECK_IN_STATUSES,
} from "@eli-coach-platform/domain/check-in";
import { sql, type SQL } from "drizzle-orm";
import {
  check,
  index,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { clientsTable } from "~/features/coaching-sales/data/schema.server";

export const checkInsTable = appSchema.table(
  "check_ins",
  {
    id: uuid("id").primaryKey(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clientsTable.id),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    clientTimeZone: varchar("client_time_zone", { length: 64 }).notNull(),
    coachTimeZone: varchar("coach_time_zone", { length: 64 }).notNull(),
    kind: varchar("kind", { enum: CHECK_IN_KINDS, length: 16 }).notNull(),
    status: varchar("status", {
      enum: RECORDED_CHECK_IN_STATUSES,
      length: 16,
    }).notNull(),
    initiatedBy: varchar("initiated_by", {
      enum: CHECK_IN_PARTIES,
      length: 16,
    }).notNull(),
    proposedBy: varchar("proposed_by", {
      enum: CHECK_IN_PARTIES,
      length: 16,
    }).notNull(),
    note: text("note"),
    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull(),
    answeredAt: timestamp("answered_at", { withTimezone: true }),
  },
  (table) => [
    index("check_ins_client_id_starts_at_idx").on(
      table.clientId,
      table.startsAt,
    ),
    check(
      "check_ins_kind_check",
      sql`${table.kind} in (${quotedList(CHECK_IN_KINDS)})`,
    ),
    check(
      "check_ins_status_check",
      sql`${table.status} in (${quotedList(RECORDED_CHECK_IN_STATUSES)})`,
    ),
    check(
      "check_ins_initiated_by_check",
      sql`${table.initiatedBy} in (${quotedList(CHECK_IN_PARTIES)})`,
    ),
    check(
      "check_ins_proposed_by_check",
      sql`${table.proposedBy} in (${quotedList(CHECK_IN_PARTIES)})`,
    ),
    check(
      "check_ins_note_length_check",
      sql`${table.note} is null or char_length(${table.note}) <= ${sql.raw(String(MAX_CHECK_IN_NOTE_LENGTH))}`,
    ),
  ],
);

function quotedList(values: readonly string[]): SQL {
  return sql.raw(values.map((value) => `'${value}'`).join(", "));
}
