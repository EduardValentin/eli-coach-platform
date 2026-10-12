import type { DatabaseClient } from "@eli-coach-platform/db";
import type {
  InvitedClient,
  InvitedClients,
} from "@eli-coach-platform/domain/client-invitation";
import { eq } from "drizzle-orm";

import {
  clientsTable,
  coachingSubscriptionsTable,
} from "~/features/coaching-sales/data/schema.server";
import {
  coachingStandingOf,
  isCurrentSubscriptionOfClient,
} from "~/features/coaching-sales/data/subscriptions/current-subscription.server";
import { subscriptionColumns } from "~/features/coaching-sales/data/subscriptions/subscription-row.server";

export class PostgresInvitedClients implements InvitedClients {
  constructor(private readonly database: DatabaseClient) {}

  async findById(clientId: string): Promise<InvitedClient | null> {
    const [row] = await this.database
      .select({
        id: clientsTable.id,
        email: clientsTable.email,
        firstName: clientsTable.firstName,
        authSubjectId: clientsTable.authSubjectId,
        subscription: subscriptionColumns,
      })
      .from(clientsTable)
      .leftJoin(coachingSubscriptionsTable, isCurrentSubscriptionOfClient)
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
      subscriptionCancelledOrEnded: coachingStandingOf(
        row.subscription,
      ).isCancelledOrEnded(),
    };
  }
}
