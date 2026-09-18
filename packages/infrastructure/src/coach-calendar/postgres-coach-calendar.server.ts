import type { DatabaseClient } from "@eli-coach-platform/db";
import type {
  BusyInterval,
  CoachCalendar,
} from "@eli-coach-platform/domain/coach-availability";
import { gt } from "drizzle-orm";

import { coachTimeReservationsTable } from "./schema.server";

export class PostgresCoachCalendar implements CoachCalendar {
  constructor(private readonly database: DatabaseClient) {}

  async busyFrom(from: Date): Promise<BusyInterval[]> {
    const rows = await this.database
      .select({
        start: coachTimeReservationsTable.startsAt,
        end: coachTimeReservationsTable.endsAt,
      })
      .from(coachTimeReservationsTable)
      .where(gt(coachTimeReservationsTable.endsAt, from))
      .orderBy(coachTimeReservationsTable.startsAt);

    return rows.map((row) => ({ start: row.start, end: row.end }));
  }
}
