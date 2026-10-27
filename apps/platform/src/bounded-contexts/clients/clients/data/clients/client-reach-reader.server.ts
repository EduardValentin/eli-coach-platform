import type { DatabaseClient } from "~/shared/database";
import {
  CoachingStanding,
  portalReachOf,
  type ClientReach,
  type ClientReachReading,
} from "~/bounded-contexts/clients/clients/domain/client";
import type { Clock } from "~/bounded-contexts/clients/clients/domain/clock";
import { eq, type SQL } from "drizzle-orm";

import { coachingStandingColumns } from "~/bounded-contexts/clients/clients/data/coaching-standing-columns.server";
import { clientsTable } from "~/bounded-contexts/clients/clients/data/schema.server";

type PostgresClientReachOptions = {
  clock: Clock;
  database: DatabaseClient;
};

export class PostgresClientReach implements ClientReach {
  constructor(private readonly options: PostgresClientReachOptions) {}

  findByAuthSubjectId(
    authSubjectId: string,
  ): Promise<ClientReachReading | null> {
    return this.findOne(eq(clientsTable.authSubjectId, authSubjectId));
  }

  findById(clientId: string): Promise<ClientReachReading | null> {
    return this.findOne(eq(clientsTable.id, clientId));
  }

  private async findOne(filter: SQL): Promise<ClientReachReading | null> {
    const [row] = await this.options.database
      .select({
        clientId: clientsTable.id,
        onboardingSubmittedAt: clientsTable.onboardingSubmittedAt,
        timeZone: clientsTable.bookingTimeZone,
        standing: coachingStandingColumns,
      })
      .from(clientsTable)
      .where(filter)
      .limit(1);

    if (!row) {
      return null;
    }

    const standing = CoachingStanding.of(row.standing);

    return {
      clientId: row.clientId,
      portal: portalReachOf({
        standing,
        onboardingSubmittedAt: row.onboardingSubmittedAt,
        now: this.options.clock.now(),
      }),
      coachingEndsAt: standing.coachingEndsAt(),
      timeZone: row.timeZone,
      programStartsAt: standing.programStartsAt,
      paidThrough: standing.paidThrough,
    };
  }
}
