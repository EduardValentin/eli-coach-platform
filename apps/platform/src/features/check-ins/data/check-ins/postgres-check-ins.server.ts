import {
  CHECK_IN_RULES,
  CheckIn,
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
import { and, asc, eq, gt, sql } from "drizzle-orm";

import { checkInsTable } from "~/features/check-ins/data/schema.server";

type CheckInRow = typeof checkInsTable.$inferSelect;

type CheckInRequest = { checkIn: CheckIn; at: Date };

type Settlement = { id: string; outcome: CheckInOutcome; at: Date };

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
      this.settleWhilePending(transaction, settlement),
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

    await transaction.execute(sql`savepoint check_in_request`);
    await transaction.insert(checkInsTable).values(this.toRow(checkIn));

    const coachTime = await this.options.coachTime.reserve(transaction, {
      ...CHECK_IN_RULES.coachTimeFrom(checkIn.startsAt),
      appointmentKind: "check_in",
      appointmentId: checkIn.id,
    });
    const decision = CheckIn.decideRequest({
      coachTime: coachTime.status,
      clientCheckIns: clientRows.map((row) => this.toCheckIn(row)),
      at,
    });

    if (decision === "requested") {
      return { status: "requested", checkIn };
    }

    await transaction.execute(sql`rollback to savepoint check_in_request`);

    return { status: decision };
  }

  private async settleWhilePending(
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
      await this.options.coachTime.release(transaction, {
        appointmentKind: "check_in",
        appointmentId: id,
      });
    }

    return "settled";
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
    });
  }
}
