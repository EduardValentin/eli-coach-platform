import {
  isCausedByDatabaseError,
  type DatabaseClient,
  type DatabaseTransaction,
} from "@eli-coach-platform/db";
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
} from "@eli-coach-platform/domain/check-in";
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
} from "~/features/check-ins/data/check-ins/check-in-rows.server";
import type { CheckInCoachTime } from "~/features/check-ins/data/check-ins/postgres-check-ins.server";
import {
  checkInConstraints,
  checkInSeriesTable,
  checkInsTable,
} from "~/features/check-ins/data/schema.server";

type PostgresCheckInSeriesOptions = {
  database: DatabaseClient;
  coachTime: CheckInCoachTime;
};

type CheckInSeriesRow = typeof checkInSeriesTable.$inferSelect;

type CheckInRowStatus = (typeof checkInsTable.$inferSelect)["status"];

type SeriesSetUp = Parameters<CheckInSeriesRecords["setUp"]>[0];
type SeriesExtension = Parameters<CheckInSeriesRecords["extend"]>[0];
type SeriesChange = Parameters<CheckInSeriesRecords["change"]>[0];
type SeriesStop = Parameters<CheckInSeriesRecords["stop"]>[0];

type FutureWeeks = { seriesId: string; startsFrom: Date; at: Date };

const UNIQUE_VIOLATION_CODE = "23505";
const WEEK_STATUSES_TO_REPLACE: CheckInRowStatus[] = [
  "pending",
  "approved",
  "clash",
];

export class PostgresCheckInSeries implements CheckInSeriesRecords {
  constructor(private readonly options: PostgresCheckInSeriesOptions) {}

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
    const rows = await this.options.database
      .select()
      .from(checkInsTable)
      .where(eq(checkInsTable.seriesId, seriesId))
      .orderBy(asc(checkInsTable.startsAt));

    return rows.map((row) => checkInOf(row));
  }

  async setUp(command: SeriesSetUp): Promise<CheckInSeriesSetUpResult> {
    try {
      return await this.options.database.transaction(async (transaction) => {
        await lockCheckInsOfClient(transaction, command.series.clientId);
        await transaction
          .insert(checkInSeriesTable)
          .values(command.series.toSnapshot());

        return {
          status: "set_up",
          occurrences: await this.recordWeeks(transaction, command.occurrences),
        };
      });
    } catch (error) {
      if (!this.violatesActiveSeriesPerClient(error)) {
        throw error;
      }

      return { status: "series_exists" };
    }
  }

  extend(command: SeriesExtension): Promise<CheckInSeriesExtension> {
    return this.options.database.transaction(async (transaction) => {
      const { series, expected } = command;

      await lockCheckInsOfClient(transaction, series.clientId);

      const widened = await transaction
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
        occurrences: await this.recordWeeks(transaction, command.occurrences),
      };
    });
  }

  change(command: SeriesChange): Promise<CheckInSeriesChangeResult> {
    return this.options.database.transaction(async (transaction) => {
      const { series, expected, at } = command;

      await lockCheckInsOfClient(transaction, series.clientId);

      const changed = await transaction
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

      await this.cancelFutureWeeks(transaction, {
        seriesId: series.id,
        startsFrom: command.startsFrom,
        at,
      });

      return {
        status: "changed",
        occurrences: await this.recordWeeks(transaction, command.occurrences),
      };
    });
  }

  stop(command: SeriesStop): Promise<"stopped" | "changed_meanwhile"> {
    return this.options.database.transaction(async (transaction) => {
      const { seriesId, expected, at } = command;
      const [owner] = await transaction
        .select({ clientId: checkInSeriesTable.clientId })
        .from(checkInSeriesTable)
        .where(eq(checkInSeriesTable.id, seriesId))
        .limit(1);

      if (!owner) {
        return "changed_meanwhile";
      }

      await lockCheckInsOfClient(transaction, owner.clientId);

      const stopped = await transaction
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

      await this.cancelFutureWeeks(transaction, {
        seriesId,
        startsFrom: at,
        at,
      });

      return "stopped";
    });
  }

  private async findOne(
    condition: SQL | undefined,
  ): Promise<CheckInSeries | null> {
    const [row] = await this.options.database
      .select()
      .from(checkInSeriesTable)
      .where(condition)
      .limit(1);

    return row ? CheckInSeries.reconstitute(this.snapshotOf(row)) : null;
  }

  private async recordWeeks(
    transaction: DatabaseTransaction,
    weeks: readonly CheckInSeriesOccurrence[],
  ): Promise<CheckIn[]> {
    const recorded: CheckIn[] = [];

    for (const week of weeks) {
      recorded.push(await this.recordWeek(transaction, week));
    }

    return recorded;
  }

  private async recordWeek(
    transaction: DatabaseTransaction,
    { checkIn, availability }: CheckInSeriesOccurrence,
  ): Promise<CheckIn> {
    await transaction.insert(checkInsTable).values(checkInRowOf(checkIn));

    const coachTime =
      availability === "closed"
        ? "not_attempted"
        : (
            await this.options.coachTime.reserve(transaction, {
              ...CHECK_IN_RULES.coachTimeFrom(checkIn.startsAt),
              appointmentKind: "check_in",
              appointmentId: checkIn.id,
            })
          ).status;
    const decided = CheckIn.decideOccurrence({
      occurrence: checkIn,
      availability,
      coachTime,
    });

    if (decided.recordedStatus !== checkIn.recordedStatus) {
      await transaction
        .update(checkInsTable)
        .set({ status: decided.recordedStatus })
        .where(eq(checkInsTable.id, checkIn.id));
    }

    return decided;
  }

  private async cancelFutureWeeks(
    transaction: DatabaseTransaction,
    { seriesId, startsFrom, at }: FutureWeeks,
  ): Promise<void> {
    const cancelled = await transaction
      .update(checkInsTable)
      .set({ status: "cancelled", answeredAt: at })
      .where(
        and(
          eq(checkInsTable.seriesId, seriesId),
          inArray(checkInsTable.status, WEEK_STATUSES_TO_REPLACE),
          gte(checkInsTable.startsAt, startsFrom),
        ),
      )
      .returning({ id: checkInsTable.id });

    for (const { id } of cancelled) {
      await this.options.coachTime.release(transaction, {
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
