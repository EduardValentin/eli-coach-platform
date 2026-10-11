import {
  CHECK_IN_RULES,
  CheckIn,
  type CheckInMove,
  type CheckInOutcome,
  type CheckInRequestResult,
  type CheckIns,
  type CheckInSettlement,
} from "@eli-coach-platform/domain/check-in";
import type { TimeInterval } from "@eli-coach-platform/domain/coach-availability";
import type {
  DatabaseClient,
  DatabaseTransaction,
} from "@eli-coach-platform/db";
import { and, asc, eq, gt, gte, inArray, sql } from "drizzle-orm";

import { checkInsTable } from "~/features/check-ins/data/schema.server";

type CheckInRow = typeof checkInsTable.$inferSelect;

type CheckInRequest = { checkIn: CheckIn; at: Date };

type RecordedStatus = CheckInRow["status"];

type Settlement = {
  id: string;
  outcome: CheckInOutcome;
  at: Date;
  expectedStatus: RecordedStatus;
  clientTimeZone?: string;
};

type CheckInMoveCommand = {
  checkIn: CheckIn;
  expected: { recordedStatus: RecordedStatus; startsAt: Date };
  at: Date;
};

type ClientCancellation = { clientId: string; startsFrom: Date; at: Date };

type CheckInAppointment = {
  appointmentKind: "check_in";
  appointmentId: string;
};

export type CheckInCoachTime = {
  reserve: (
    transaction: DatabaseTransaction,
    reservation: CheckInAppointment & TimeInterval,
  ) => Promise<{ status: "reserved" | "taken" }>;
  release: (
    transaction: DatabaseTransaction,
    appointment: CheckInAppointment,
  ) => Promise<void>;
};

type PostgresCheckInsOptions = {
  database: DatabaseClient;
  coachTime: CheckInCoachTime;
};

const CLIENT_REQUEST_LOCK_PREFIX = "check-in-request:";
const REQUEST_SAVEPOINT = sql.identifier("check_in_request");
const MOVE_SAVEPOINT = sql.identifier("check_in_move");
const OPEN_STATUSES: RecordedStatus[] = ["pending", "approved"];

export class PostgresCheckIns implements CheckIns {
  constructor(private readonly options: PostgresCheckInsOptions) {}

  request(command: CheckInRequest): Promise<CheckInRequestResult> {
    return this.options.database.transaction((transaction) =>
      this.requestUnderClientLock(transaction, command),
    );
  }

  async find(id: string): Promise<CheckIn | null> {
    const [row] = await this.options.database
      .select()
      .from(checkInsTable)
      .where(eq(checkInsTable.id, id))
      .limit(1);

    return row ? this.toCheckIn(row) : null;
  }

  async listForClient(clientId: string): Promise<CheckIn[]> {
    const rows = await this.options.database
      .select()
      .from(checkInsTable)
      .where(eq(checkInsTable.clientId, clientId))
      .orderBy(asc(checkInsTable.startsAt));

    return rows.map((row) => this.toCheckIn(row));
  }

  async listAll(): Promise<CheckIn[]> {
    const rows = await this.options.database
      .select()
      .from(checkInsTable)
      .orderBy(asc(checkInsTable.startsAt));

    return rows.map((row) => this.toCheckIn(row));
  }

  settle(settlement: Settlement): Promise<CheckInSettlement> {
    return this.options.database.transaction((transaction) =>
      this.settleWhileExpected(transaction, settlement),
    );
  }

  move(command: CheckInMoveCommand): Promise<CheckInMove> {
    return this.options.database.transaction((transaction) =>
      this.moveWhileExpected(transaction, command),
    );
  }

  cancelStartingFrom(
    cancellation: ClientCancellation,
  ): Promise<{ cancelled: string[] }> {
    return this.options.database.transaction((transaction) =>
      this.cancelUpcomingStartingFrom(transaction, cancellation),
    );
  }

  private async requestUnderClientLock(
    transaction: DatabaseTransaction,
    { checkIn, at }: CheckInRequest,
  ): Promise<CheckInRequestResult> {
    await transaction.execute(
      sql`select pg_advisory_xact_lock(hashtext(${CLIENT_REQUEST_LOCK_PREFIX + checkIn.clientId}))`,
    );

    const clientRows = await transaction
      .select()
      .from(checkInsTable)
      .where(eq(checkInsTable.clientId, checkIn.clientId));

    await transaction.execute(sql`savepoint ${REQUEST_SAVEPOINT}`);
    await transaction.insert(checkInsTable).values(this.toRow(checkIn));

    const coachTime = await this.options.coachTime.reserve(transaction, {
      ...CHECK_IN_RULES.coachTimeFrom(checkIn.startsAt),
      appointmentKind: "check_in",
      appointmentId: checkIn.id,
    });
    const decision = CheckIn.decideRequest({
      initiatedBy: checkIn.initiatedBy,
      coachTime: coachTime.status,
      clientCheckIns: clientRows.map((row) => this.toCheckIn(row)),
      at,
    });

    if (decision === "requested") {
      return { status: "requested", checkIn };
    }

    await transaction.execute(sql`rollback to savepoint ${REQUEST_SAVEPOINT}`);

    return { status: decision };
  }

  private async settleWhileExpected(
    transaction: DatabaseTransaction,
    { id, outcome, at, expectedStatus, clientTimeZone }: Settlement,
  ): Promise<CheckInSettlement> {
    const settled = await transaction
      .update(checkInsTable)
      .set({ status: outcome, answeredAt: at, clientTimeZone })
      .where(
        and(
          eq(checkInsTable.id, id),
          eq(checkInsTable.status, expectedStatus),
          gt(checkInsTable.startsAt, at),
        ),
      )
      .returning({ id: checkInsTable.id });

    if (settled.length === 0) {
      return "changed_meanwhile";
    }

    if (outcome === "cancelled") {
      await this.releaseHourOf(transaction, id);
    }

    return "settled";
  }

  private async moveWhileExpected(
    transaction: DatabaseTransaction,
    { checkIn, expected, at }: CheckInMoveCommand,
  ): Promise<CheckInMove> {
    const snapshot = checkIn.toSnapshot();

    await transaction.execute(sql`savepoint ${MOVE_SAVEPOINT}`);

    const moved = await transaction
      .update(checkInsTable)
      .set({
        startsAt: snapshot.startsAt,
        earlierStartsAt: snapshot.earlierStartsAt,
        moves: snapshot.moves,
        newTimeNote: snapshot.newTimeNote,
        status: snapshot.recordedStatus,
        proposedBy: snapshot.proposedBy,
        answeredAt: snapshot.answeredAt,
        clientTimeZone: snapshot.clientTimeZone,
      })
      .where(
        and(
          eq(checkInsTable.id, snapshot.id),
          eq(checkInsTable.status, expected.recordedStatus),
          eq(checkInsTable.startsAt, expected.startsAt),
          gt(checkInsTable.startsAt, at),
        ),
      )
      .returning({ id: checkInsTable.id });

    if (moved.length === 0) {
      return "changed_meanwhile";
    }

    await this.releaseHourOf(transaction, snapshot.id);

    const coachTime = await this.options.coachTime.reserve(transaction, {
      ...CHECK_IN_RULES.coachTimeFrom(snapshot.startsAt),
      appointmentKind: "check_in",
      appointmentId: snapshot.id,
    });

    if (coachTime.status === "taken") {
      await transaction.execute(sql`rollback to savepoint ${MOVE_SAVEPOINT}`);

      return "time_taken";
    }

    return "moved";
  }

  private async cancelUpcomingStartingFrom(
    transaction: DatabaseTransaction,
    { clientId, startsFrom, at }: ClientCancellation,
  ): Promise<{ cancelled: string[] }> {
    const cancelled = await transaction
      .update(checkInsTable)
      .set({ status: "cancelled", answeredAt: at })
      .where(
        and(
          eq(checkInsTable.clientId, clientId),
          inArray(checkInsTable.status, OPEN_STATUSES),
          gte(checkInsTable.startsAt, startsFrom),
          gt(checkInsTable.startsAt, at),
        ),
      )
      .returning({ id: checkInsTable.id });

    for (const { id } of cancelled) {
      await this.releaseHourOf(transaction, id);
    }

    return { cancelled: cancelled.map(({ id }) => id) };
  }

  private releaseHourOf(
    transaction: DatabaseTransaction,
    checkInId: string,
  ): Promise<void> {
    return this.options.coachTime.release(transaction, {
      appointmentKind: "check_in",
      appointmentId: checkInId,
    });
  }

  private toRow(checkIn: CheckIn): typeof checkInsTable.$inferInsert {
    const snapshot = checkIn.toSnapshot();

    return {
      id: snapshot.id,
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

  private toCheckIn(row: CheckInRow): CheckIn {
    return CheckIn.reconstitute({
      id: row.id,
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
}
