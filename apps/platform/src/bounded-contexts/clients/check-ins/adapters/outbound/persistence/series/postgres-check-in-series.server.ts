import {
  isCausedByDatabaseError,
  type DatabaseClient,
} from "~/shared/database";
import { executorOf, inSavepoint } from "~/shared/database/index.server";
import {
  CheckInSeries,
  type CheckIn,
  type CheckInSeriesChange,
  type CheckInSeriesRecords,
  type CheckInSeriesSnapshot,
  type CheckInSeriesStop,
  type HeldCheckIn,
  OPEN_CHECK_IN_STATUSES,
} from "~/bounded-contexts/clients/check-ins/domain/check-in";
import {
  and,
  asc,
  eq,
  gte,
  inArray,
  isNull,
  type Column,
  type SQL,
} from "drizzle-orm";

import {
  checkInOf,
  checkInRowOf,
  heldReservationIdsOf,
  lockCheckInsOfClient,
  reservationsHeldBy,
} from "~/bounded-contexts/clients/check-ins/adapters/outbound/persistence/check-ins/check-in-rows.server";
import {
  checkInConstraints,
  checkInSeriesTable,
  checkInsTable,
} from "~/bounded-contexts/clients/check-ins/adapters/outbound/persistence/schema.server";

type CheckInSeriesRow = typeof checkInSeriesTable.$inferSelect;

type SeriesWidening = Parameters<CheckInSeriesRecords["widen"]>[0];
type SeriesChange = Parameters<CheckInSeriesRecords["change"]>[0];
type SeriesStop = Parameters<CheckInSeriesRecords["stop"]>[0];

type CancelledWeeks = {
  cancelledIds: string[];
  freedReservationIds: string[];
};

type FutureWeeks = { seriesId: string; startsFrom: Date; at: Date };

const UNIQUE_VIOLATION_CODE = "23505";

export class PostgresCheckInSeries implements CheckInSeriesRecords {
  constructor(private readonly database: DatabaseClient) {}

  private get executor() {
    return executorOf(this.database);
  }

  find(id: string): Promise<CheckInSeries | null> {
    return this.findOne(eq(checkInSeriesTable.id, id));
  }

  findActiveForClient(clientId: string): Promise<CheckInSeries | null> {
    return this.findOne(
      and(
        eq(checkInSeriesTable.clientId, clientId),
        isNull(checkInSeriesTable.stoppedAt),
      ),
    );
  }

  async listOccurrences(seriesId: string): Promise<CheckIn[]> {
    const rows = await this.executor
      .select()
      .from(checkInsTable)
      .where(eq(checkInsTable.seriesId, seriesId))
      .orderBy(asc(checkInsTable.startsAt));

    return rows.map((row) => checkInOf(row));
  }

  async start(series: CheckInSeries): Promise<"started" | "series_exists"> {
    await lockCheckInsOfClient(this.executor, series.clientId);

    return (await this.insertSeries(series)) === "series_exists"
      ? "series_exists"
      : "started";
  }

  async widen({
    series,
    expected,
  }: SeriesWidening): Promise<"widened" | "changed_meanwhile"> {
    await lockCheckInsOfClient(this.executor, series.clientId);

    const widened = await this.executor
      .update(checkInSeriesTable)
      .set({ coversFrom: series.coversFrom, coversUntil: series.coversUntil })
      .where(
        and(
          this.isActive(series.id),
          eq(checkInSeriesTable.coversFrom, expected.coversFrom),
          eq(checkInSeriesTable.coversUntil, expected.coversUntil),
        ),
      )
      .returning({ id: checkInSeriesTable.id });

    return widened.length === 0 ? "changed_meanwhile" : "widened";
  }

  async change(command: SeriesChange): Promise<CheckInSeriesChange> {
    const { series, expected, at } = command;

    await lockCheckInsOfClient(this.executor, series.clientId);

    const changed = await this.executor
      .update(checkInSeriesTable)
      .set({
        weekday: series.weekday,
        hour: series.hour,
        timeZone: series.timeZone,
        changedAt: series.changedAt,
      })
      .where(
        and(
          this.isActive(series.id),
          eq(checkInSeriesTable.weekday, expected.weekday),
          eq(checkInSeriesTable.hour, expected.hour),
          this.holds(checkInSeriesTable.changedAt, expected.changedAt),
        ),
      )
      .returning({ id: checkInSeriesTable.id });

    if (changed.length === 0) {
      return { status: "changed_meanwhile" };
    }

    return {
      status: "changed",
      ...(await this.cancelFutureWeeks({
        seriesId: series.id,
        startsFrom: command.startsFrom,
        at,
      })),
    };
  }

  async stop(command: SeriesStop): Promise<CheckInSeriesStop> {
    const { seriesId, expected, at } = command;
    const [owner] = await this.executor
      .select({ clientId: checkInSeriesTable.clientId })
      .from(checkInSeriesTable)
      .where(eq(checkInSeriesTable.id, seriesId))
      .limit(1);

    if (!owner) {
      return { status: "changed_meanwhile" };
    }

    await lockCheckInsOfClient(this.executor, owner.clientId);

    const stopped = await this.executor
      .update(checkInSeriesTable)
      .set({ stoppedAt: at })
      .where(
        and(
          this.isActive(seriesId),
          this.holds(checkInSeriesTable.changedAt, expected.changedAt),
        ),
      )
      .returning({ id: checkInSeriesTable.id });

    if (stopped.length === 0) {
      return { status: "changed_meanwhile" };
    }

    return {
      status: "stopped",
      ...(await this.cancelFutureWeeks({ seriesId, startsFrom: at, at })),
    };
  }

  async recordWeeks(weeks: readonly HeldCheckIn[]): Promise<void> {
    if (weeks.length === 0) {
      return;
    }

    await this.executor.insert(checkInsTable).values(
      weeks.map(({ checkIn, reservationId }) => ({
        ...checkInRowOf(checkIn),
        reservationId,
      })),
    );
  }

  private async findOne(
    condition: SQL | undefined,
  ): Promise<CheckInSeries | null> {
    const [row] = await this.executor
      .select()
      .from(checkInSeriesTable)
      .where(condition)
      .limit(1);

    return row ? CheckInSeries.reconstitute(this.snapshotOf(row)) : null;
  }

  private async insertSeries(
    series: CheckInSeries,
  ): Promise<"inserted" | "series_exists"> {
    try {
      await inSavepoint(this.executor, (savepoint) =>
        savepoint.insert(checkInSeriesTable).values(series.toSnapshot()),
      );
    } catch (error) {
      if (!this.violatesActiveSeriesPerClient(error)) {
        throw error;
      }

      return "series_exists";
    }

    return "inserted";
  }

  private async cancelFutureWeeks({
    seriesId,
    startsFrom,
    at,
  }: FutureWeeks): Promise<CancelledWeeks> {
    const cancelled = await reservationsHeldBy(
      this.executor,
      and(
        eq(checkInsTable.seriesId, seriesId),
        inArray(checkInsTable.status, [...OPEN_CHECK_IN_STATUSES]),
        gte(checkInsTable.startsAt, startsFrom),
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

    return {
      cancelledIds: cancelled.map(({ id }) => id),
      freedReservationIds: heldReservationIdsOf(cancelled),
    };
  }

  private isActive(seriesId: string): SQL | undefined {
    return and(
      eq(checkInSeriesTable.id, seriesId),
      isNull(checkInSeriesTable.stoppedAt),
    );
  }

  private holds(column: Column, value: Date | null): SQL {
    return value === null ? isNull(column) : eq(column, value);
  }

  private snapshotOf(row: CheckInSeriesRow): CheckInSeriesSnapshot {
    return {
      id: row.id,
      clientId: row.clientId,
      weekday: row.weekday,
      hour: row.hour,
      timeZone: row.timeZone,
      coversFrom: row.coversFrom,
      coversUntil: row.coversUntil,
      setUpAt: row.setUpAt,
      changedAt: row.changedAt,
      stoppedAt: row.stoppedAt,
    };
  }

  private violatesActiveSeriesPerClient(error: unknown): boolean {
    return isCausedByDatabaseError(
      error,
      ({ code, constraint }) =>
        code === UNIQUE_VIOLATION_CODE &&
        constraint === checkInConstraints.activeSeriesPerClient,
    );
  }
}
