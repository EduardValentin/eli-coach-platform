import {
  type CheckIn,
  type CheckInMove,
  type CheckInMoveCommand,
  type CheckInOutcome,
  type CheckInsPort,
  type CheckInsAtCoachingEnd,
  type CheckInSettlement,
  type HeldCheckIn,
  OPEN_CHECK_IN_STATUSES,
} from "~/bounded-contexts/clients/check-ins/domain/check-in";
import type { DatabaseClient } from "~/shared/database";
import { executorOf } from "~/shared/database/index.server";
import { and, asc, eq, gt, gte, inArray, isNull } from "drizzle-orm";

import {
  checkInOf,
  checkInRowOf,
  heldReservationIdsOf,
  lockCheckInsOfClient,
  reservationsHeldBy,
  type CheckInRow,
} from "~/bounded-contexts/clients/check-ins/adapters/outbound/persistence/check-ins/check-in-rows.server";
import {
  checkInSeriesTable,
  checkInsTable,
} from "~/bounded-contexts/clients/check-ins/adapters/outbound/persistence/schema.server";

type RecordedStatus = CheckInRow["status"];

type Settlement = {
  id: string;
  outcome: CheckInOutcome;
  at: Date;
  expectedStatus: RecordedStatus;
  clientTimeZone?: string;
};

type CoachingEnd = { clientId: string; endsAt: Date; at: Date };

export class PostgresCheckInsRepository implements CheckInsPort {
  constructor(private readonly database: DatabaseClient) {}

  private get executor() {
    return executorOf(this.database);
  }

  async listForClientLocked(clientId: string): Promise<CheckIn[]> {
    await lockCheckInsOfClient(this.executor, clientId);

    const rows = await this.executor
      .select()
      .from(checkInsTable)
      .where(eq(checkInsTable.clientId, clientId));

    return rows.map((row) => checkInOf(row));
  }

  async add({ checkIn, reservationId }: HeldCheckIn): Promise<void> {
    await this.executor
      .insert(checkInsTable)
      .values({ ...checkInRowOf(checkIn), reservationId });
  }

  async find(id: string): Promise<CheckIn | null> {
    const [row] = await this.executor
      .select()
      .from(checkInsTable)
      .where(eq(checkInsTable.id, id))
      .limit(1);

    return row ? checkInOf(row) : null;
  }

  async listForClient(clientId: string): Promise<CheckIn[]> {
    const rows = await this.executor
      .select()
      .from(checkInsTable)
      .where(eq(checkInsTable.clientId, clientId))
      .orderBy(asc(checkInsTable.startsAt));

    return rows.map((row) => checkInOf(row));
  }

  async listAll(): Promise<CheckIn[]> {
    const rows = await this.executor
      .select()
      .from(checkInsTable)
      .orderBy(asc(checkInsTable.startsAt));

    return rows.map((row) => checkInOf(row));
  }

  async settle({
    id,
    outcome,
    at,
    expectedStatus,
    clientTimeZone,
  }: Settlement): Promise<CheckInSettlement> {
    const freesItsHour = outcome === "cancelled";
    const [held] = freesItsHour
      ? await reservationsHeldBy(this.executor, eq(checkInsTable.id, id))
      : [];
    const settled = await this.executor
      .update(checkInsTable)
      .set({
        status: outcome,
        answeredAt: at,
        clientTimeZone,
        ...(freesItsHour && { reservationId: null }),
      })
      .where(
        and(
          eq(checkInsTable.id, id),
          eq(checkInsTable.status, expectedStatus),
          gt(checkInsTable.startsAt, at),
        ),
      )
      .returning({ id: checkInsTable.id });

    if (settled.length === 0) {
      return { status: "changed_meanwhile" };
    }

    return {
      status: "settled",
      freedReservationId: held?.reservationId ?? null,
    };
  }

  async move({
    checkIn,
    expected,
    reservationId,
    at,
  }: CheckInMoveCommand): Promise<CheckInMove> {
    const snapshot = checkIn.toSnapshot();
    const [held] = await reservationsHeldBy(
      this.executor,
      eq(checkInsTable.id, snapshot.id),
    );
    const moved = await this.executor
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
        ...(reservationId !== undefined && { reservationId }),
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
      return { status: "changed_meanwhile" };
    }

    return {
      status: "moved",
      freedReservationId:
        reservationId === undefined ? null : (held?.reservationId ?? null),
    };
  }

  async endCoaching({
    clientId,
    endsAt,
    at,
  }: CoachingEnd): Promise<CheckInsAtCoachingEnd> {
    await lockCheckInsOfClient(this.executor, clientId);

    const cancelled = await reservationsHeldBy(
      this.executor,
      and(
        eq(checkInsTable.clientId, clientId),
        inArray(checkInsTable.status, [...OPEN_CHECK_IN_STATUSES]),
        gte(checkInsTable.startsAt, endsAt),
        gt(checkInsTable.startsAt, at),
      ),
    );

    if (cancelled.length > 0) {
      await this.executor
        .update(checkInsTable)
        .set({ status: "cancelled", answeredAt: at, reservationId: null })
        .where(
          inArray(
            checkInsTable.id,
            cancelled.map(({ id }) => id),
          ),
        );
    }

    const stopped = await this.executor
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
      freedReservationIds: heldReservationIdsOf(cancelled),
    };
  }
}
