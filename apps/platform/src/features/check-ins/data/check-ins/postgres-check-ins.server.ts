import {
  CHECK_IN_RULES,
  CheckIn,
  type CheckInOutcome,
  type CheckInRequestResult,
  type CheckIns,
  type CheckInSettlement,
} from "@eli-coach-platform/domain/check-in";
import type {
  DatabaseClient,
  DatabaseTransaction,
} from "@eli-coach-platform/db";
import {
  releaseCoachTime,
  reserveCoachTime,
} from "@eli-coach-platform/infrastructure/coach-calendar/server";
import { and, asc, eq, gt, sql } from "drizzle-orm";

import { checkInsTable } from "~/features/check-ins/data/schema.server";

type CheckInRow = typeof checkInsTable.$inferSelect;

type CheckInRequest = { checkIn: CheckIn; at: Date };

type Settlement = { id: string; outcome: CheckInOutcome; at: Date };

const CLIENT_REQUEST_LOCK_PREFIX = "check-in-request:";

export class PostgresCheckIns implements CheckIns {
  constructor(private readonly database: DatabaseClient) {}

  request(command: CheckInRequest): Promise<CheckInRequestResult> {
    return this.database.transaction((transaction) =>
      PostgresCheckIns.requestUnderClientLock(transaction, command),
    );
  }

  async find(id: string): Promise<CheckIn | null> {
    const [row] = await this.database
      .select()
      .from(checkInsTable)
      .where(eq(checkInsTable.id, id))
      .limit(1);

    return row ? PostgresCheckIns.toCheckIn(row) : null;
  }

  async listForClient(clientId: string): Promise<CheckIn[]> {
    const rows = await this.database
      .select()
      .from(checkInsTable)
      .where(eq(checkInsTable.clientId, clientId))
      .orderBy(asc(checkInsTable.startsAt));

    return rows.map(PostgresCheckIns.toCheckIn);
  }

  async listAll(): Promise<CheckIn[]> {
    const rows = await this.database
      .select()
      .from(checkInsTable)
      .orderBy(asc(checkInsTable.startsAt));

    return rows.map(PostgresCheckIns.toCheckIn);
  }

  settle(settlement: Settlement): Promise<CheckInSettlement> {
    return this.database.transaction((transaction) =>
      PostgresCheckIns.settleWhilePending(transaction, settlement),
    );
  }

  private static async requestUnderClientLock(
    transaction: DatabaseTransaction,
    { checkIn, at }: CheckInRequest,
  ): Promise<CheckInRequestResult> {
    await transaction.execute(
      sql`select pg_advisory_xact_lock(hashtext(${CLIENT_REQUEST_LOCK_PREFIX + checkIn.clientId}))`,
    );

    const waitingRequest = await PostgresCheckIns.findWaitingRequest(
      transaction,
      { clientId: checkIn.clientId, at },
    );
    const appointment = {
      appointmentKind: "check_in",
      appointmentId: checkIn.id,
    } as const;
    const coachTime = await reserveCoachTime(transaction, {
      ...CHECK_IN_RULES.coachTimeFrom(checkIn.startsAt),
      ...appointment,
    });
    const decision = CheckIn.decideRequest({
      coachTime: coachTime.status,
      waitingRequest,
    });

    if (decision === "requested") {
      await transaction
        .insert(checkInsTable)
        .values(PostgresCheckIns.toRow(checkIn));

      return { status: "requested", checkIn };
    }

    if (coachTime.status === "reserved") {
      await releaseCoachTime(transaction, appointment);
    }

    return { status: decision };
  }

  private static async findWaitingRequest(
    transaction: DatabaseTransaction,
    { clientId, at }: { clientId: string; at: Date },
  ): Promise<CheckIn | null> {
    const [row] = await transaction
      .select()
      .from(checkInsTable)
      .where(
        and(
          eq(checkInsTable.clientId, clientId),
          eq(checkInsTable.status, "pending"),
          eq(checkInsTable.initiatedBy, "client"),
          gt(checkInsTable.startsAt, at),
        ),
      )
      .limit(1);

    return row ? PostgresCheckIns.toCheckIn(row) : null;
  }

  private static async settleWhilePending(
    transaction: DatabaseTransaction,
    { id, outcome, at }: Settlement,
  ): Promise<CheckInSettlement> {
    const settled = await transaction
      .update(checkInsTable)
      .set({ status: outcome, answeredAt: at })
      .where(
        and(
          eq(checkInsTable.id, id),
          eq(checkInsTable.status, "pending"),
          gt(checkInsTable.startsAt, at),
        ),
      )
      .returning({ id: checkInsTable.id });

    if (settled.length === 0) {
      return "not_pending";
    }

    if (outcome === "cancelled") {
      await releaseCoachTime(transaction, {
        appointmentKind: "check_in",
        appointmentId: id,
      });
    }

    return "settled";
  }

  private static toRow(checkIn: CheckIn): typeof checkInsTable.$inferInsert {
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
    };
  }

  private static toCheckIn(row: CheckInRow): CheckIn {
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
    });
  }
}
