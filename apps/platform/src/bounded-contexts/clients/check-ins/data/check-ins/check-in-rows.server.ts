import type { DatabaseTransaction } from "~/shared/database";
import { CheckIn } from "~/bounded-contexts/clients/check-ins/domain/check-in";
import { sql } from "drizzle-orm";

import { checkInsTable } from "~/bounded-contexts/clients/check-ins/data/schema.server";

export type CheckInRow = typeof checkInsTable.$inferSelect;

const CLIENT_CHECK_INS_LOCK_PREFIX = "check-in-request:";

export async function lockCheckInsOfClient(
  transaction: DatabaseTransaction,
  clientId: string,
): Promise<void> {
  await transaction.execute(
    sql`select pg_advisory_xact_lock(hashtext(${CLIENT_CHECK_INS_LOCK_PREFIX + clientId}))`,
  );
}

export function checkInRowOf(
  checkIn: CheckIn,
): typeof checkInsTable.$inferInsert {
  const snapshot = checkIn.toSnapshot();

  return {
    id: snapshot.id,
    seriesId: snapshot.seriesId,
    clientId: snapshot.clientId,
    startsAt: snapshot.startsAt,
    clientTimeZone: snapshot.clientTimeZone,
    coachTimeZone: snapshot.coachTimeZone,
    kind: snapshot.kind,
    status: snapshot.recordedStatus,
    initiatedBy: snapshot.initiatedBy,
    proposedBy: snapshot.proposedBy,
    note: snapshot.note,
    requestedAt: snapshot.requestedAt,
    answeredAt: snapshot.answeredAt,
    earlierStartsAt: snapshot.earlierStartsAt,
    moves: snapshot.moves,
    newTimeNote: snapshot.newTimeNote,
  };
}

export function checkInOf(row: CheckInRow): CheckIn {
  return CheckIn.reconstitute({
    id: row.id,
    seriesId: row.seriesId,
    clientId: row.clientId,
    startsAt: row.startsAt,
    clientTimeZone: row.clientTimeZone,
    coachTimeZone: row.coachTimeZone,
    kind: row.kind,
    recordedStatus: row.status,
    initiatedBy: row.initiatedBy,
    proposedBy: row.proposedBy,
    note: row.note,
    requestedAt: row.requestedAt,
    answeredAt: row.answeredAt,
    earlierStartsAt: row.earlierStartsAt,
    moves: row.moves,
    newTimeNote: row.newTimeNote,
  });
}
