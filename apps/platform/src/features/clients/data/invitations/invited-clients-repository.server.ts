import type { DatabaseClient } from "@eli-coach-platform/db";
import { CoachingStanding } from "@eli-coach-platform/domain/client";
import type {
  InvitedClient,
  InvitedClients,
} from "@eli-coach-platform/domain/client-invitation";
import { eq } from "drizzle-orm";

import { coachingStandingColumns } from "~/features/clients/data/coaching-standing-columns.server";
import { clientsTable } from "~/features/clients/data/schema.server";

export class PostgresInvitedClients implements InvitedClients {
  constructor(private readonly database: DatabaseClient) {}

  async findById(clientId: string): Promise<InvitedClient | null> {
    const [row] = await this.database
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
      subscriptionCancelledOrEnded: CoachingStanding.of(
        row.standing,
      ).isCancelledOrEnded(),
    };
  }
}
