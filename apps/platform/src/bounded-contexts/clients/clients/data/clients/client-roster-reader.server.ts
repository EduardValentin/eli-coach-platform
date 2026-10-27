import type { DatabaseClient } from "~/shared/database";
import type {
  ClientRoster,
  ClientRosterEntry,
} from "~/bounded-contexts/clients/clients/domain/client-roster";
import { desc, eq } from "drizzle-orm";

import { coachingStandingColumns } from "~/bounded-contexts/clients/clients/data/coaching-standing-columns.server";
import { clientsTable } from "~/bounded-contexts/clients/clients/data/schema.server";

export class PostgresClientRoster implements ClientRoster {
  constructor(private readonly database: DatabaseClient) {}

  async list(): Promise<ClientRosterEntry[]> {
    const rows = await selectRoster(this.database).orderBy(
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
      createdAt: clientsTable.createdAt,
      standing: coachingStandingColumns,
    })
    .from(clientsTable);
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
      standing: row.standing,
    },
    accountBound: row.authSubjectId !== null,
    booking: {
      email: row.email,
      gender: row.gender,
      assessmentCallId: row.assessmentCallId,
    },
    joinedAt: row.createdAt,
  };
}
