import type { DatabaseClient } from "~/shared/database";
import type {
  CoachCalendar,
  TimeInterval,
} from "~/bounded-contexts/scheduling/coach-schedule/domain/coach-availability";
import { gt } from "drizzle-orm";

import { coachTimeReservationsTable } from "../schema.server";

export class PostgresCoachCalendar implements CoachCalendar {
  constructor(private readonly database: DatabaseClient) {}

  async busyFrom(from: Date): Promise<TimeInterval[]> {
    return this.database
      .select({
        start: coachTimeReservationsTable.startsAt,
        end: coachTimeReservationsTable.endsAt,
      })
      .from(coachTimeReservationsTable)
      .where(gt(coachTimeReservationsTable.endsAt, from))
      .orderBy(coachTimeReservationsTable.startsAt);
  }
}
