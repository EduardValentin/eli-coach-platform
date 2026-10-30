import type { DatabaseClient } from "~/shared/database";
import { executorOf } from "~/shared/database/index.server";
import type {
  CoachCalendarPort,
  TimeInterval,
} from "~/bounded-contexts/scheduling/coach-schedule/domain/coach-availability";
import { gt } from "drizzle-orm";

import { coachTimeReservationsTable } from "../schema.server";

export class PostgresCoachCalendarRepository implements CoachCalendarPort {
  constructor(private readonly database: DatabaseClient) {}

  private get executor() {
    return executorOf(this.database);
  }

  async busyFrom(from: Date): Promise<TimeInterval[]> {
    return this.executor
      .select({
        start: coachTimeReservationsTable.startsAt,
        end: coachTimeReservationsTable.endsAt,
      })
      .from(coachTimeReservationsTable)
      .where(gt(coachTimeReservationsTable.endsAt, from))
      .orderBy(coachTimeReservationsTable.startsAt);
  }
}
