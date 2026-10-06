import type { DatabaseClient } from "@eli-coach-platform/db";
import type {
  InvitedClient,
  InvitedClients,
} from "@eli-coach-platform/domain/client-invitation";
import { CoachingSubscription } from "@eli-coach-platform/domain/coaching-subscription";
import { eq } from "drizzle-orm";

import { clientsTable } from "~/features/coaching-sales/data/schema.server";
import { currentSubscriptionStatus } from "~/features/coaching-sales/data/subscriptions/current-subscription.server";

export class PostgresInvitedClients implements InvitedClients {
  constructor(private readonly database: DatabaseClient) {}

  async findById(clientId: string): Promise<InvitedClient | null> {
    const [row] = await this.database
      .select({
        id: clientsTable.id,
        email: clientsTable.email,
        firstName: clientsTable.firstName,
        authSubjectId: clientsTable.authSubjectId,
        currentSubscriptionStatus,
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
      subscriptionCancelledOrEnded: CoachingSubscription.isCancelledOrEnded(
        row.currentSubscriptionStatus,
      ),
    };
  }
}
