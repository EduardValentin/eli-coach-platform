import type { DatabaseClient } from "@eli-coach-platform/db";
import {
  ClientJourney,
  type ClientJourneys,
} from "@eli-coach-platform/domain/client-journey";
import type {
  OnboardingReviewStamps,
  ReviewStamps,
} from "@eli-coach-platform/domain/client-onboarding";
import { and, eq, isNull } from "drizzle-orm";

import { writeReviewStamps } from "~/features/coaching-sales/data/client-journeys/review-stamps.server";
import { clientsTable } from "~/features/coaching-sales/data/schema.server";

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
      })
      .from(clientsTable)
      .where(eq(clientsTable.authSubjectId, authSubjectId))
      .limit(1);

    return row ? ClientJourney.from(row) : null;
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
