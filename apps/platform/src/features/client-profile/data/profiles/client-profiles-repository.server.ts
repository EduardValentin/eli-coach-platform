import type {
  DatabaseClient,
  DatabaseTransaction,
} from "@eli-coach-platform/db";
import {
  ClientProfile,
  type ClientProfiles,
} from "@eli-coach-platform/domain/client-profile";
import { eq } from "drizzle-orm";

import { clientProfilesTable } from "~/features/client-profile/data/schema.server";

export class PostgresClientProfiles implements ClientProfiles {
  constructor(private readonly database: DatabaseClient) {}

  async findByClientId(clientId: string): Promise<ClientProfile | null> {
    const [row] = await this.database
      .select({
        clientId: clientProfilesTable.clientId,
        heightCm: clientProfilesTable.heightCm,
        activityLevel: clientProfilesTable.activityLevel,
        primaryGoal: clientProfilesTable.primaryGoal,
        dietaryRestrictions: clientProfilesTable.dietaryRestrictions,
        clientNotes: clientProfilesTable.clientNotes,
        updatedAt: clientProfilesTable.updatedAt,
      })
      .from(clientProfilesTable)
      .where(eq(clientProfilesTable.clientId, clientId))
      .limit(1);

    return row ? ClientProfile.reconstitute(row) : null;
  }
}

export async function saveClientProfile(
  transaction: DatabaseTransaction,
  profile: ClientProfile,
): Promise<void> {
  const { clientId, ...columns } = profile.toSnapshot();

  await transaction
    .insert(clientProfilesTable)
    .values({ clientId, ...columns, createdAt: columns.updatedAt })
    .onConflictDoUpdate({ target: clientProfilesTable.clientId, set: columns });
}
