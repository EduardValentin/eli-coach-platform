import { appSchema } from "~/shared/database";
import {
  CHECK_IN_KINDS,
  CHECK_IN_PARTIES,
  MAX_CHECK_IN_MOVES,
  MAX_CHECK_IN_NOTE_LENGTH,
  RECORDED_CHECK_IN_STATUSES,
  WEEKDAYS,
} from "~/bounded-contexts/clients/check-ins/domain/check-in";
import { sql, type SQL } from "drizzle-orm";
import {
  check,
  index,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { LAST_HOUR_OF_DAY } from "~/bounded-contexts/clients/check-ins/public/check-ins";
import { clientsTable } from "~/bounded-contexts/clients/clients/adapters/outbound/persistence/schema.server";
import { coachTimeReservationsTable } from "~/bounded-contexts/scheduling/coach-schedule/adapters/outbound/persistence/schema.server";

export const checkInConstraints = {
  activeSeriesPerClient: "check_in_series_active_per_client_unique",
} as const;

export const checkInSeriesTable = appSchema.table(
  "check_in_series",
  {
    id: uuid("id").primaryKey(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clientsTable.id),
    weekday: varchar("weekday", { enum: WEEKDAYS, length: 9 }).notNull(),
    hour: smallint("hour").notNull(),
    timeZone: varchar("time_zone", { length: 64 }).notNull(),
    coversFrom: timestamp("covers_from", { withTimezone: true }).notNull(),
    coversUntil: timestamp("covers_until", { withTimezone: true }).notNull(),
    setUpAt: timestamp("set_up_at", { withTimezone: true }).notNull(),
    changedAt: timestamp("changed_at", { withTimezone: true }),
    stoppedAt: timestamp("stopped_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex(checkInConstraints.activeSeriesPerClient)
      .on(table.clientId)
      .where(sql`${table.stoppedAt} is null`),
    check(
      "check_in_series_weekday_check",
      sql`${table.weekday} in (${quotedList(WEEKDAYS)})`,
    ),
    check(
      "check_in_series_hour_check",
      sql`${table.hour} between 0 and ${sql.raw(String(LAST_HOUR_OF_DAY))}`,
    ),
  ],
);

export const checkInsTable = appSchema.table(
  "check_ins",
  {
    id: uuid("id").primaryKey(),
    seriesId: uuid("series_id").references(() => checkInSeriesTable.id, {
      onDelete: "restrict",
    }),
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
    earlierStartsAt: timestamp("earlier_starts_at", { withTimezone: true }),
    moves: smallint("moves").notNull().default(0),
    newTimeNote: text("new_time_note"),
    reservationId: uuid("reservation_id")
      .unique()
      .references(() => coachTimeReservationsTable.id, {
        onDelete: "restrict",
      }),
  },
  (table) => [
    index("check_ins_client_id_starts_at_idx").on(
      table.clientId,
      table.startsAt,
    ),
    index("check_ins_series_id_starts_at_idx").on(
      table.seriesId,
      table.startsAt,
    ),
    index("check_ins_status_starts_at_idx").on(table.status, table.startsAt),
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
    check(
      "check_ins_new_time_note_length_check",
      sql`${table.newTimeNote} is null or char_length(${table.newTimeNote}) <= ${sql.raw(String(MAX_CHECK_IN_NOTE_LENGTH))}`,
    ),
    check(
      "check_ins_moves_check",
      sql`${table.moves} between 0 and ${sql.raw(String(MAX_CHECK_IN_MOVES))}`,
    ),
  ],
);

function quotedList(values: readonly string[]): SQL {
  return sql.raw(values.map((value) => `'${value}'`).join(", "));
}
