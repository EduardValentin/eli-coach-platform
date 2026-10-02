import type { DatabaseClient } from "@eli-coach-platform/db";
import type {
  ClientRoster,
  ClientRosterEntry,
} from "@eli-coach-platform/domain/client-roster";
import { and, desc, eq, gt, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import {
  clientsTable,
  coachingSubscriptionsTable,
} from "~/features/coaching-sales/data/schema.server";
import {
  subscriptionColumns,
  toSubscriptionSnapshot,
} from "~/features/coaching-sales/data/subscriptions/subscription-row.server";

const LATER_SUBSCRIPTIONS = "later_coaching_subscriptions";

const laterSubscriptions = alias(
  coachingSubscriptionsTable,
  LATER_SUBSCRIPTIONS,
);

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
      and(
        eq(coachingSubscriptionsTable.clientId, clientsTable.id),
        sql`not exists (select 1 from ${coachingSubscriptionsTable} ${sql.identifier(LATER_SUBSCRIPTIONS)} where ${and(
          eq(laterSubscriptions.clientId, clientsTable.id),
          gt(laterSubscriptions.paidAt, coachingSubscriptionsTable.paidAt),
        )})`,
      ),
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
