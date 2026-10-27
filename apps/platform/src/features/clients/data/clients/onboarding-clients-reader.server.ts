import type { DatabaseClient } from "~/shared/database";
import { CoachingStanding } from "@eli-coach-platform/domain/client";
import type {
  OnboardingClient,
  OnboardingClients,
} from "@eli-coach-platform/domain/client-onboarding";
import { eq, type SQL } from "drizzle-orm";

import { coachingStandingColumns } from "~/features/clients/data/coaching-standing-columns.server";
import { clientsTable } from "~/features/clients/data/schema.server";

export class PostgresOnboardingClients implements OnboardingClients {
  constructor(private readonly database: DatabaseClient) {}

  findByAuthSubjectId(authSubjectId: string): Promise<OnboardingClient | null> {
    return this.findOne(eq(clientsTable.authSubjectId, authSubjectId));
  }

  findByClientId(clientId: string): Promise<OnboardingClient | null> {
    return this.findOne(eq(clientsTable.id, clientId));
  }

  private async findOne(filter: SQL): Promise<OnboardingClient | null> {
    const [row] = await this.database
      .select({
        clientId: clientsTable.id,
        submittedAt: clientsTable.onboardingSubmittedAt,
        reviewOpenedAt: clientsTable.reviewOpenedAt,
        detailsRequestedAt: clientsTable.detailsRequestedAt,
        detailsAnsweredAt: clientsTable.detailsAnsweredAt,
        answersApprovedAt: clientsTable.answersApprovedAt,
        standing: coachingStandingColumns,
      })
      .from(clientsTable)
      .where(filter)
      .limit(1);

    if (!row) {
      return null;
    }

    return {
      clientId: row.clientId,
      submittedAt: row.submittedAt,
      reviewStamps: {
        reviewOpenedAt: row.reviewOpenedAt,
        detailsRequestedAt: row.detailsRequestedAt,
        detailsAnsweredAt: row.detailsAnsweredAt,
        answersApprovedAt: row.answersApprovedAt,
      },
      standing: CoachingStanding.of(row.standing),
    };
  }
}
