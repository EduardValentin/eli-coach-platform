import {
  CHECK_IN_RULES,
  CheckIn,
  type CheckInMove,
  type CheckInOutcome,
  type CheckInRequestResult,
  type CheckIns,
  type CheckInsAtCoachingEnd,
  type CheckInSettlement,
  OPEN_CHECK_IN_STATUSES,
} from "@eli-coach-platform/domain/check-in";
import type { TimeInterval } from "@eli-coach-platform/domain/coach-availability";
import type {
  DatabaseClient,
  DatabaseTransaction,
} from "@eli-coach-platform/db";
import { and, asc, eq, gt, gte, inArray, isNull, sql } from "drizzle-orm";

import {
  checkInOf,
  checkInRowOf,
  lockCheckInsOfClient,
  type CheckInRow,
} from "~/features/check-ins/data/check-ins/check-in-rows.server";
import {
  checkInSeriesTable,
  checkInsTable,
} from "~/features/check-ins/data/schema.server";

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

type CoachingEnd = { clientId: string; endsAt: Date; at: Date };

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

const REQUEST_SAVEPOINT = sql.identifier("check_in_request");
const MOVE_SAVEPOINT = sql.identifier("check_in_move");

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

    return row ? checkInOf(row) : null;
  }

  async listForClient(clientId: string): Promise<CheckIn[]> {
    const rows = await this.options.database
      .select()
      .from(checkInsTable)
      .where(eq(checkInsTable.clientId, clientId))
      .orderBy(asc(checkInsTable.startsAt));

    return rows.map((row) => checkInOf(row));
  }

  async listAll(): Promise<CheckIn[]> {
    const rows = await this.options.database
      .select()
      .from(checkInsTable)
      .orderBy(asc(checkInsTable.startsAt));

    return rows.map((row) => checkInOf(row));
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

  endCoaching(end: CoachingEnd): Promise<CheckInsAtCoachingEnd> {
    return this.options.database.transaction((transaction) =>
      this.endCoachingUnderClientLock(transaction, end),
    );
  }

  private async requestUnderClientLock(
    transaction: DatabaseTransaction,
    { checkIn, at }: CheckInRequest,
  ): Promise<CheckInRequestResult> {
    await lockCheckInsOfClient(transaction, checkIn.clientId);

    const clientRows = await transaction
      .select()
      .from(checkInsTable)
      .where(eq(checkInsTable.clientId, checkIn.clientId));

    await transaction.execute(sql`savepoint ${REQUEST_SAVEPOINT}`);
    await transaction.insert(checkInsTable).values(checkInRowOf(checkIn));

    const coachTime = await this.options.coachTime.reserve(transaction, {
      ...CHECK_IN_RULES.coachTimeFrom(checkIn.startsAt),
      appointmentKind: "check_in",
      appointmentId: checkIn.id,
    });
    const decision = CheckIn.decideRequest({
      initiatedBy: checkIn.initiatedBy,
      coachTime: coachTime.status,
      clientCheckIns: clientRows.map((row) => checkInOf(row)),
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

  private async endCoachingUnderClientLock(
    transaction: DatabaseTransaction,
    { clientId, endsAt, at }: CoachingEnd,
  ): Promise<CheckInsAtCoachingEnd> {
    await lockCheckInsOfClient(transaction, clientId);

    const cancelled = await transaction
      .update(checkInsTable)
      .set({ status: "cancelled", answeredAt: at })
      .where(
        and(
          eq(checkInsTable.clientId, clientId),
          inArray(checkInsTable.status, [...OPEN_CHECK_IN_STATUSES]),
          gte(checkInsTable.startsAt, endsAt),
          gt(checkInsTable.startsAt, at),
        ),
      )
      .returning({ id: checkInsTable.id });

    for (const { id } of cancelled) {
      await this.releaseHourOf(transaction, id);
    }

    const stopped = await transaction
      .update(checkInSeriesTable)
      .set({ stoppedAt: at })
      .where(
        and(
          eq(checkInSeriesTable.clientId, clientId),
          isNull(checkInSeriesTable.stoppedAt),
        ),
      )
      .returning({ id: checkInSeriesTable.id });

    return {
      cancelled: cancelled.map(({ id }) => id),
      seriesStopped: stopped.length > 0,
    };
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
}
