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
        progressPhotosConsentedAt:
          clientProfilesTable.progressPhotosConsentedAt,
        updatedAt: clientProfilesTable.updatedAt,
      })
      .from(clientProfilesTable)
      .where(eq(clientProfilesTable.clientId, clientId))
      .limit(1);

    return row ? ClientProfile.reconstitute(row) : null;
  }

  async recordPhotoConsent(clientId: string, at: Date): Promise<void> {
    await this.database
      .update(clientProfilesTable)
      .set({ progressPhotosConsentedAt: at })
      .where(eq(clientProfilesTable.clientId, clientId));
  }
}

export async function saveClientProfile(
  transaction: DatabaseTransaction,
  profile: ClientProfile,
): Promise<void> {
  const snapshot = profile.toSnapshot();
  const factsUpdate = { ...profile.facts(), updatedAt: snapshot.updatedAt };

  await transaction
    .insert(clientProfilesTable)
    .values({ ...snapshot, createdAt: snapshot.updatedAt })
    .onConflictDoUpdate({
      target: clientProfilesTable.clientId,
      set: factsUpdate,
    });
}
