import type { DatabaseClient } from "@eli-coach-platform/db";
import type {
  OnboardingClient,
  OnboardingClients,
} from "@eli-coach-platform/domain/client-onboarding";
import type { MeasurementClients } from "@eli-coach-platform/domain/client-profile";
import type { UnitPreferenceClients } from "@eli-coach-platform/domain/unit-preference";
import { eq, type SQL } from "drizzle-orm";

import {
  clientsTable,
  coachingSubscriptionsTable,
} from "~/features/coaching-sales/data/schema.server";
import {
  coachingStandingOf,
  isCurrentSubscriptionOfClient,
} from "~/features/coaching-sales/data/subscriptions/current-subscription.server";
import { subscriptionColumns } from "~/features/coaching-sales/data/subscriptions/subscription-row.server";

export class PostgresOnboardingClients
  implements OnboardingClients, UnitPreferenceClients, MeasurementClients
{
  constructor(private readonly database: DatabaseClient) {}

  async exists(clientId: string): Promise<boolean> {
    const [row] = await this.database
      .select({ clientId: clientsTable.id })
      .from(clientsTable)
      .where(eq(clientsTable.id, clientId))
      .limit(1);

    return row !== undefined;
  }

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
        subscription: subscriptionColumns,
      })
      .from(clientsTable)
      .leftJoin(coachingSubscriptionsTable, isCurrentSubscriptionOfClient)
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
      standing: coachingStandingOf(row.subscription),
    };
  }
}
