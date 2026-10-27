import type { DatabaseClient } from "~/shared/database";
import { executorOf } from "~/shared/database/index.server";
import { CoachingStanding } from "~/bounded-contexts/clients/clients/domain/client";
import type {
  InvitedClient,
  InvitedClients,
} from "~/bounded-contexts/clients/clients/domain/client-invitation";
import { eq } from "drizzle-orm";

import { coachingStandingColumns } from "~/bounded-contexts/clients/clients/adapters/outbound/persistence/coaching-standing-columns.server";
import { clientsTable } from "~/bounded-contexts/clients/clients/adapters/outbound/persistence/schema.server";

export class PostgresInvitedClients implements InvitedClients {
  constructor(private readonly database: DatabaseClient) {}

  private get executor() {
    return executorOf(this.database);
  }

  async findById(clientId: string): Promise<InvitedClient | null> {
    const [row] = await this.executor
      .select({
        id: clientsTable.id,
        email: clientsTable.email,
        firstName: clientsTable.firstName,
        authSubjectId: clientsTable.authSubjectId,
        standing: coachingStandingColumns,
      })
      .from(clientsTable)
      .where(eq(clientsTable.id, clientId))
      .limit(1);

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      email: row.email,
      firstName: row.firstName,
      authSubjectId: row.authSubjectId,
      coachingCancelledOrEnded: CoachingStanding.of(
        row.standing,
      ).isCancelledOrEnded(),
    };
  }
}
