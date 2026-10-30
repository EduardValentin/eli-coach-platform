import type { DatabaseClient } from "~/shared/database";
import { executorOf } from "~/shared/database/index.server";
import {
  CoachingStanding,
  portalReachOf,
  type ClientReachPort,
  type ClientReachReading,
} from "~/bounded-contexts/clients/clients/domain/client";
import type { ClockPort } from "~/bounded-contexts/clients/clients/domain/clock-port";
import { eq, type SQL } from "drizzle-orm";

import { coachingStandingColumns } from "~/bounded-contexts/clients/clients/adapters/outbound/persistence/coaching-standing-columns.server";
import { clientsTable } from "~/bounded-contexts/clients/clients/adapters/outbound/persistence/schema.server";

type PostgresClientReachOptions = {
  clockPort: ClockPort;
  database: DatabaseClient;
};

export class PostgresClientReachRepository implements ClientReachPort {
  constructor(private readonly options: PostgresClientReachOptions) {}

  private get executor() {
    return executorOf(this.options.database);
  }

  findByAuthSubjectId(
    authSubjectId: string,
  ): Promise<ClientReachReading | null> {
    return this.findOne(eq(clientsTable.authSubjectId, authSubjectId));
  }

  findById(clientId: string): Promise<ClientReachReading | null> {
    return this.findOne(eq(clientsTable.id, clientId));
  }

  private async findOne(filter: SQL): Promise<ClientReachReading | null> {
    const [row] = await this.executor
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
        now: this.options.clockPort.now(),
      }),
      coachingEndsAt: standing.coachingEndsAt(),
      timeZone: row.timeZone,
      programStartsAt: standing.programStartsAt,
      paidThrough: standing.paidThrough,
    };
  }
}
