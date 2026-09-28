import type { DatabaseClient } from "@eli-coach-platform/db";
import type {
  OnboardingClient,
  OnboardingClients,
} from "@eli-coach-platform/domain/client-onboarding";
import type { UnitPreferenceClients } from "@eli-coach-platform/domain/unit-preference";
import { eq } from "drizzle-orm";

import { clientsTable } from "~/features/coaching-sales/data/schema.server";

export class PostgresOnboardingClients
  implements OnboardingClients, UnitPreferenceClients
{
  constructor(private readonly database: DatabaseClient) {}

  async findByAuthSubjectId(
    authSubjectId: string,
  ): Promise<OnboardingClient | null> {
    const [row] = await this.database
      .select({
        clientId: clientsTable.id,
        gender: clientsTable.gender,
        dateOfBirth: clientsTable.dateOfBirth,
      })
      .from(clientsTable)
      .where(eq(clientsTable.authSubjectId, authSubjectId))
      .limit(1);

    return row ?? null;
  }
}
