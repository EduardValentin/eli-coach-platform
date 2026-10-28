import type {
  CoachTimeHold,
  CoachTimeReservations,
  TimeInterval,
} from "~/bounded-contexts/scheduling/coach-schedule/domain/coach-availability";
import {
  isCausedByDatabaseError,
  type DatabaseClient,
} from "~/shared/database";
import { executorOf, inSavepoint } from "~/shared/database/index.server";
import { eq, sql } from "drizzle-orm";

import {
  COACH_TIME_RESERVATIONS_NO_OVERLAP,
  coachTimeReservationsTable,
} from "../schema.server";

const EXCLUSION_VIOLATION_CODE = "23P01";
const COACH_TIME_LOCK = "coach-time-reservations";

export class PostgresCoachTimeReservations implements CoachTimeReservations {
  constructor(private readonly database: DatabaseClient) {}

  private get executor() {
    return executorOf(this.database);
  }

  async reserve(interval: TimeInterval): Promise<CoachTimeHold> {
    await this.executor.execute(
      sql`select pg_advisory_xact_lock(hashtext(${COACH_TIME_LOCK}))`,
    );

    try {
      const [reserved] = await inSavepoint(this.executor, (savepoint) =>
        savepoint
          .insert(coachTimeReservationsTable)
          .values({ startsAt: interval.start, endsAt: interval.end })
          .returning({ id: coachTimeReservationsTable.id }),
      );

      return { status: "reserved", reservationId: reserved.id };
    } catch (error) {
      if (!this.isOverlapViolation(error)) {
        throw error;
      }

      return { status: "taken" };
    }
  }

  async release(reservationId: string): Promise<void> {
    await this.executor
      .delete(coachTimeReservationsTable)
      .where(eq(coachTimeReservationsTable.id, reservationId));
  }

  private isOverlapViolation(error: unknown): boolean {
    return isCausedByDatabaseError(
      error,
      ({ code, constraint }) =>
        code === EXCLUSION_VIOLATION_CODE &&
        constraint === COACH_TIME_RESERVATIONS_NO_OVERLAP,
    );
  }
}
