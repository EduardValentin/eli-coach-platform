import type { DatabaseClient } from "@eli-coach-platform/db";
import {
  ClientProfile,
  type ClientProfileSave,
  type ClientProfileSaveOutcome,
  type ClientProfiles,
} from "@eli-coach-platform/domain/client-profile";
import { and, eq } from "drizzle-orm";

import {
  COACHING_COLUMNS,
  coachingColumnsOf,
  coachingOf,
  sharedColumnsOf,
} from "~/features/client-profile/data/profiles/coaching-columns.server";
import { clientProfilesTable } from "~/features/client-profile/data/schema.server";

type ProfileColumns = Partial<typeof clientProfilesTable.$inferInsert>;

export class PostgresClientProfiles implements ClientProfiles {
  constructor(private readonly database: DatabaseClient) {}

  async findByClientId(clientId: string): Promise<ClientProfile | null> {
    const [row] = await this.database
      .select({
        ...COACHING_COLUMNS,
        clientId: clientProfilesTable.clientId,
        coachNotes: clientProfilesTable.coachNotes,
        coachingSeededAt: clientProfilesTable.coachingSeededAt,
        progressPhotosConsentedAt:
          clientProfilesTable.progressPhotosConsentedAt,
        createdAt: clientProfilesTable.createdAt,
        updatedAt: clientProfilesTable.updatedAt,
      })
      .from(clientProfilesTable)
      .where(eq(clientProfilesTable.clientId, clientId))
      .limit(1);

    if (!row) {
      return null;
    }

    return ClientProfile.reconstitute({
      clientId: row.clientId,
      coaching: row.coachingSeededAt === null ? null : coachingOf(row),
      coachNotes: row.coachNotes,
      coachingSeededAt: row.coachingSeededAt,
      progressPhotosConsentedAt: row.progressPhotosConsentedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  async saveSharedFacts(
    save: ClientProfileSave,
  ): Promise<ClientProfileSaveOutcome> {
    const { coaching } = save.profile.toSnapshot();

    return coaching
      ? this.updateWhileUnchanged(save, sharedColumnsOf(coaching))
      : "changed-meanwhile";
  }

  async saveCoachFacts(
    save: ClientProfileSave,
  ): Promise<ClientProfileSaveOutcome> {
    const { coaching, coachNotes } = save.profile.toSnapshot();

    return coaching
      ? this.updateWhileUnchanged(save, {
          ...coachingColumnsOf(coaching),
          coachNotes,
        })
      : "changed-meanwhile";
  }

  async recordPhotoConsent(clientId: string, at: Date): Promise<void> {
    await this.database
      .update(clientProfilesTable)
      .set({ progressPhotosConsentedAt: at })
      .where(eq(clientProfilesTable.clientId, clientId));
  }

  private async updateWhileUnchanged(
    save: ClientProfileSave,
    columns: ProfileColumns,
  ): Promise<ClientProfileSaveOutcome> {
    const { clientId, updatedAt } = save.profile.toSnapshot();
    const updated = await this.database
      .update(clientProfilesTable)
      .set({ ...columns, updatedAt })
      .where(
        and(
          eq(clientProfilesTable.clientId, clientId),
          eq(clientProfilesTable.updatedAt, save.expectedUpdatedAt),
        ),
      )
      .returning({ clientId: clientProfilesTable.clientId });

    return updated.length > 0 ? "saved" : "changed-meanwhile";
  }
}
