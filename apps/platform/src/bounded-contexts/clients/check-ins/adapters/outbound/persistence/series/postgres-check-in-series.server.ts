import {
  isCausedByDatabaseError,
  type DatabaseClient,
} from "~/shared/database";
import { createUnitOfWork, executorOf } from "~/shared/database/index.server";
import {
  CHECK_IN_RULES,
  CheckIn,
  CheckInSeries,
  type CheckInSeriesChangeResult,
  type CheckInSeriesExtension,
  type CheckInSeriesOccurrence,
  type CheckInSeriesRecords,
  type CheckInSeriesSetUpResult,
  type CheckInSeriesSnapshot,
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
  lockCheckInsOfClient,
} from "~/bounded-contexts/clients/check-ins/adapters/outbound/persistence/check-ins/check-in-rows.server";
import type { CheckInCoachTime } from "~/bounded-contexts/clients/check-ins/adapters/outbound/persistence/check-ins/postgres-check-ins.server";
import {
  checkInConstraints,
  checkInSeriesTable,
  checkInsTable,
} from "~/bounded-contexts/clients/check-ins/adapters/outbound/persistence/schema.server";

type PostgresCheckInSeriesOptions = {
  database: DatabaseClient;
  coachTime: CheckInCoachTime;
};

type CheckInSeriesRow = typeof checkInSeriesTable.$inferSelect;

type SeriesSetUp = Parameters<CheckInSeriesRecords["setUp"]>[0];
type SeriesExtension = Parameters<CheckInSeriesRecords["extend"]>[0];
type SeriesChange = Parameters<CheckInSeriesRecords["change"]>[0];
type SeriesStop = Parameters<CheckInSeriesRecords["stop"]>[0];

type FutureWeeks = { seriesId: string; startsFrom: Date; at: Date };

const UNIQUE_VIOLATION_CODE = "23505";

export class PostgresCheckInSeries implements CheckInSeriesRecords {
  constructor(private readonly options: PostgresCheckInSeriesOptions) {}

  private get executor() {
    return executorOf(this.options.database);
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

  async setUp(command: SeriesSetUp): Promise<CheckInSeriesSetUpResult> {
    await lockCheckInsOfClient(this.executor, command.series.clientId);

    if ((await this.insertSeries(command.series)) === "series_exists") {
      return { status: "series_exists" };
    }

    return {
      status: "set_up",
      occurrences: await this.recordWeeks(command.occurrences),
    };
  }

  extend(command: SeriesExtension): Promise<CheckInSeriesExtension> {
    return createUnitOfWork(this.options.database)(async () => {
      const { series, expected } = command;

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

      if (widened.length === 0) {
        return { status: "changed_meanwhile" };
      }

      return {
        status: "extended",
        occurrences: await this.recordWeeks(command.occurrences),
      };
    });
  }

  async change(command: SeriesChange): Promise<CheckInSeriesChangeResult> {
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

    await this.cancelFutureWeeks({
      seriesId: series.id,
      startsFrom: command.startsFrom,
      at,
    });

    return {
      status: "changed",
      occurrences: await this.recordWeeks(command.occurrences),
    };
  }

  async stop(command: SeriesStop): Promise<"stopped" | "changed_meanwhile"> {
    const { seriesId, expected, at } = command;
    const [owner] = await this.executor
      .select({ clientId: checkInSeriesTable.clientId })
      .from(checkInSeriesTable)
      .where(eq(checkInSeriesTable.id, seriesId))
      .limit(1);

    if (!owner) {
      return "changed_meanwhile";
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
      return "changed_meanwhile";
    }

    await this.cancelFutureWeeks({ seriesId, startsFrom: at, at });

    return "stopped";
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
    series: SeriesSetUp["series"],
  ): Promise<"inserted" | "series_exists"> {
    try {
      await this.executor.transaction((savepoint) =>
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

  private async recordWeeks(
    weeks: readonly CheckInSeriesOccurrence[],
  ): Promise<CheckIn[]> {
    const recorded: CheckIn[] = [];

    for (const week of weeks) {
      recorded.push(await this.recordWeek(week));
    }

    return recorded;
  }

  private async recordWeek({
    checkIn,
    availability,
  }: CheckInSeriesOccurrence): Promise<CheckIn> {
    await this.executor.insert(checkInsTable).values(checkInRowOf(checkIn));

    const decided = CheckIn.decideOccurrence({
      occurrence: checkIn,
      availability,
      coachTime: await this.coachTimeOf({ checkIn, availability }),
    });

    if (decided.recordedStatus !== checkIn.recordedStatus) {
      await this.executor
        .update(checkInsTable)
        .set({ status: decided.recordedStatus })
        .where(eq(checkInsTable.id, checkIn.id));
    }

    return decided;
  }

  private async coachTimeOf({
    checkIn,
    availability,
  }: CheckInSeriesOccurrence): Promise<"reserved" | "taken" | "not_attempted"> {
    if (availability === "closed") {
      return "not_attempted";
    }

    const reserved = await this.options.coachTime.reserve({
      ...CHECK_IN_RULES.coachTimeFrom(checkIn.startsAt),
      appointmentKind: "check_in",
      appointmentId: checkIn.id,
    });

    return reserved.status;
  }

  private async cancelFutureWeeks({
    seriesId,
    startsFrom,
    at,
  }: FutureWeeks): Promise<void> {
    const cancelled = await this.executor
      .update(checkInsTable)
      .set({ status: "cancelled", answeredAt: at })
      .where(
        and(
          eq(checkInsTable.seriesId, seriesId),
          inArray(checkInsTable.status, [...OPEN_CHECK_IN_STATUSES]),
          gte(checkInsTable.startsAt, startsFrom),
        ),
      )
      .returning({ id: checkInsTable.id });

    for (const { id } of cancelled) {
      await this.options.coachTime.release({
        appointmentKind: "check_in",
        appointmentId: id,
      });
    }
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
