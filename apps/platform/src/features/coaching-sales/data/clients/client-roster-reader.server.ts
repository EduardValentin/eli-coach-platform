import type { DatabaseClient } from "@eli-coach-platform/db";
import type {
  ClientRoster,
  ClientRosterEntry,
} from "@eli-coach-platform/domain/client-roster";
import { desc, eq, sql } from "drizzle-orm";

import {
  clientsTable,
  coachingSubscriptionsTable,
} from "~/features/coaching-sales/data/schema.server";
import { currentSubscriptionIdOfClient } from "~/features/coaching-sales/data/subscriptions/current-subscription.server";
import {
  subscriptionColumns,
  toSubscriptionSnapshot,
} from "~/features/coaching-sales/data/subscriptions/subscription-row.server";

export class PostgresClientRoster implements ClientRoster {
  constructor(private readonly database: DatabaseClient) {}

  async list(): Promise<ClientRosterEntry[]> {
    const rows = await selectRoster(this.database).orderBy(
      sql`${coachingSubscriptionsTable.paidAt} desc nulls last`,
      desc(clientsTable.createdAt),
    );

    return rows.map(toRosterEntry);
  }

  async findById(clientId: string): Promise<ClientRosterEntry | null> {
    const [row] = await selectRoster(this.database)
      .where(eq(clientsTable.id, clientId))
      .limit(1);

    return row ? toRosterEntry(row) : null;
  }
}

function selectRoster(database: DatabaseClient) {
  return database
    .select({
      clientId: clientsTable.id,
      firstName: clientsTable.firstName,
      lastName: clientsTable.lastName,
      gender: clientsTable.gender,
      welcomeSeenAt: clientsTable.welcomeSeenAt,
      onboardingSubmittedAt: clientsTable.onboardingSubmittedAt,
      reviewOpenedAt: clientsTable.reviewOpenedAt,
      detailsRequestedAt: clientsTable.detailsRequestedAt,
      detailsAnsweredAt: clientsTable.detailsAnsweredAt,
      answersApprovedAt: clientsTable.answersApprovedAt,
      authSubjectId: clientsTable.authSubjectId,
      email: clientsTable.email,
      assessmentCallId: clientsTable.assessmentCallId,
      subscription: subscriptionColumns,
    })
    .from(clientsTable)
    .leftJoin(
      coachingSubscriptionsTable,
      eq(coachingSubscriptionsTable.id, currentSubscriptionIdOfClient),
    );
}

type RosterRow = Awaited<ReturnType<typeof selectRoster>>[number];

function toRosterEntry(row: RosterRow): ClientRosterEntry {
  return {
    journey: {
      clientId: row.clientId,
      firstName: row.firstName,
      lastName: row.lastName,
      gender: row.gender,
      welcomeSeenAt: row.welcomeSeenAt,
      onboardingSubmittedAt: row.onboardingSubmittedAt,
      reviewOpenedAt: row.reviewOpenedAt,
      detailsRequestedAt: row.detailsRequestedAt,
      detailsAnsweredAt: row.detailsAnsweredAt,
      answersApprovedAt: row.answersApprovedAt,
    },
    accountBound: row.authSubjectId !== null,
    booking: {
      email: row.email,
      gender: row.gender,
      assessmentCallId: row.assessmentCallId,
    },
    subscription: row.subscription
      ? toSubscriptionSnapshot(row.subscription)
      : null,
  };
}
