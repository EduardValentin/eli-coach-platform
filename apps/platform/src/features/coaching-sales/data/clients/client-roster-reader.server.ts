import type { DatabaseClient } from "@eli-coach-platform/db";
import type {
  ClientRoster,
  ClientRosterEntry,
} from "@eli-coach-platform/domain/client-roster";
import { and, desc, eq, sql } from "drizzle-orm";

import {
  clientsTable,
  coachingSubscriptionsTable,
} from "~/features/coaching-sales/data/schema.server";

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
      dateOfBirth: clientsTable.dateOfBirth,
      country: clientsTable.country,
      phone: clientsTable.phone,
      primaryGoal: clientsTable.primaryGoal,
      assessmentCallId: clientsTable.assessmentCallId,
      bundleId: coachingSubscriptionsTable.bundleId,
      months: coachingSubscriptionsTable.months,
      tier: coachingSubscriptionsTable.tier,
      paidAt: coachingSubscriptionsTable.paidAt,
      startChoice: coachingSubscriptionsTable.startChoice,
      subscriptionStatus: coachingSubscriptionsTable.status,
    })
    .from(clientsTable)
    .leftJoin(
      coachingSubscriptionsTable,
      and(
        eq(coachingSubscriptionsTable.clientId, clientsTable.id),
        sql`${coachingSubscriptionsTable.status} <> 'ended'`,
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
    profile: {
      email: row.email,
      dateOfBirth: row.dateOfBirth,
      gender: row.gender,
      country: row.country,
      phone: row.phone,
      primaryGoal: row.primaryGoal,
      assessmentCallId: row.assessmentCallId,
    },
    subscription: subscriptionOf(row),
  };
}

function subscriptionOf(row: RosterRow): ClientRosterEntry["subscription"] {
  if (
    row.bundleId === null ||
    row.months === null ||
    row.tier === null ||
    row.paidAt === null ||
    row.startChoice === null ||
    row.subscriptionStatus === null
  ) {
    return null;
  }

  return {
    bundleId: row.bundleId,
    months: row.months,
    tier: row.tier,
    paidAt: row.paidAt,
    startChoice: row.startChoice,
    status: row.subscriptionStatus,
  };
}
