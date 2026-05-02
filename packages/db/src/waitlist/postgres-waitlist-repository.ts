import {
  type WaitlistRepository,
  type WaitlistReservationResult,
} from "@eli-coach-platform/domain";
import { count, eq, sql } from "drizzle-orm";
import type { DatabaseClient } from "../database-client";
import { waitlistEntriesTable } from "../schema";

export class PostgresWaitlistRepository implements WaitlistRepository {
  constructor(private readonly database: DatabaseClient) {}

  async countEntries(): Promise<number> {
    const [result] = await this.database
      .select({ entryCount: count() })
      .from(waitlistEntriesTable);

    return result?.entryCount ?? 0;
  }

  async reserveSpot(options: {
    cap: number;
    normalizedEmail: string;
  }): Promise<WaitlistReservationResult> {
    return this.database.transaction(async (transaction) => {
      await transaction.execute(sql`lock table app.waitlist_entries in share row exclusive mode`);

      const duplicate = await transaction
        .select({ id: waitlistEntriesTable.id })
        .from(waitlistEntriesTable)
        .where(eq(waitlistEntriesTable.email, options.normalizedEmail))
        .limit(1);

      if (duplicate.length > 0) {
        return { status: "already_joined" };
      }

      const [countResult] = await transaction
        .select({ entryCount: count() })
        .from(waitlistEntriesTable);
      const entryCount = countResult?.entryCount ?? 0;

      if (entryCount >= options.cap) {
        return { status: "spots_full" };
      }

      await transaction.insert(waitlistEntriesTable).values({
        email: options.normalizedEmail,
      });

      return {
        status: "reserved",
        spotsRemaining: options.cap - entryCount - 1,
      };
    });
  }
}
