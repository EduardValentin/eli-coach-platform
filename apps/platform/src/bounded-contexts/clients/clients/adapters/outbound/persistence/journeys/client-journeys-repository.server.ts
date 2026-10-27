import type { DatabaseClient } from "~/shared/database";
import {
  ClientJourney,
  type ClientJourneys,
} from "~/bounded-contexts/clients/clients/domain/client-journey";
import type {
  OnboardingReviewStamps,
  ReviewStamps,
} from "~/bounded-contexts/clients/client-profile/domain/client-onboarding";
import { and, eq, isNull } from "drizzle-orm";

import { coachingStandingColumns } from "~/bounded-contexts/clients/clients/adapters/outbound/persistence/coaching-standing-columns.server";
import { writeReviewStamps } from "~/bounded-contexts/clients/clients/adapters/outbound/persistence/journeys/review-stamps.server";
import { clientsTable } from "~/bounded-contexts/clients/clients/adapters/outbound/persistence/schema.server";

export class PostgresClientJourneys
  implements ClientJourneys, OnboardingReviewStamps
{
  constructor(private readonly database: DatabaseClient) {}

  async findByAuthSubjectId(
    authSubjectId: string,
  ): Promise<ClientJourney | null> {
    const [row] = await this.database
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
        standing: coachingStandingColumns,
      })
      .from(clientsTable)
      .where(eq(clientsTable.authSubjectId, authSubjectId))
      .limit(1);

    if (!row) {
      return null;
    }

    return ClientJourney.from(row);
  }

  async recordWelcomeSeen(input: {
    clientId: string;
    at: Date;
  }): Promise<void> {
    await this.database
      .update(clientsTable)
      .set({ welcomeSeenAt: input.at })
      .where(
        and(
          eq(clientsTable.id, input.clientId),
          isNull(clientsTable.welcomeSeenAt),
        ),
      );
  }

  async recordOnboardingSubmitted(input: {
    clientId: string;
    at: Date;
  }): Promise<void> {
    await this.database
      .update(clientsTable)
      .set({ onboardingSubmittedAt: input.at })
      .where(
        and(
          eq(clientsTable.id, input.clientId),
          isNull(clientsTable.onboardingSubmittedAt),
        ),
      );
  }

  async record(input: {
    clientId: string;
    stamps: ReviewStamps;
  }): Promise<void> {
    await this.database.transaction((transaction) =>
      writeReviewStamps(transaction, input),
    );
  }
}
