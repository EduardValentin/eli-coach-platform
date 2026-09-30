import type { DatabaseClient } from "@eli-coach-platform/db";
import type {
  OnboardingClient,
  OnboardingClients,
} from "@eli-coach-platform/domain/client-onboarding";
import type { UnitPreferenceClients } from "@eli-coach-platform/domain/unit-preference";
import { eq, type SQL } from "drizzle-orm";

import { clientsTable } from "~/features/coaching-sales/data/schema.server";

export class PostgresOnboardingClients
  implements OnboardingClients, UnitPreferenceClients
{
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
        firstName: clientsTable.firstName,
        lastName: clientsTable.lastName,
        email: clientsTable.email,
        gender: clientsTable.gender,
        dateOfBirth: clientsTable.dateOfBirth,
        country: clientsTable.country,
        phone: clientsTable.phone,
        submittedAt: clientsTable.onboardingSubmittedAt,
        reviewOpenedAt: clientsTable.reviewOpenedAt,
        detailsRequestedAt: clientsTable.detailsRequestedAt,
        detailsAnsweredAt: clientsTable.detailsAnsweredAt,
        answersApprovedAt: clientsTable.answersApprovedAt,
      })
      .from(clientsTable)
      .where(filter)
      .limit(1);

    if (!row) {
      return null;
    }

    return {
      clientId: row.clientId,
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      gender: row.gender,
      dateOfBirth: row.dateOfBirth,
      country: row.country,
      phone: row.phone,
      submittedAt: row.submittedAt,
      reviewStamps: {
        reviewOpenedAt: row.reviewOpenedAt,
        detailsRequestedAt: row.detailsRequestedAt,
        detailsAnsweredAt: row.detailsAnsweredAt,
        answersApprovedAt: row.answersApprovedAt,
      },
    };
  }
}
