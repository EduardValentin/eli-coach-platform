import type { DatabaseClient } from "~/shared/database";
import {
  ClientSettings,
  type ClientSettingsChanges,
  type ClientSettingsSource,
} from "@eli-coach-platform/domain/client-settings";
import { eq } from "drizzle-orm";

import { clientSettingsTable } from "~/features/client-profile/data/schema.server";

export class PostgresClientSettings
  implements ClientSettingsSource, ClientSettingsChanges
{
  constructor(private readonly database: DatabaseClient) {}

  async findByClientId(clientId: string): Promise<ClientSettings | null> {
    const [row] = await this.database
      .select({
        clientId: clientSettingsTable.clientId,
        weightUnit: clientSettingsTable.weightUnit,
        heightUnit: clientSettingsTable.heightUnit,
        preferredCheckInWeekday: clientSettingsTable.preferredCheckInWeekday,
        preferredChannel: clientSettingsTable.preferredChannel,
        updatedAt: clientSettingsTable.updatedAt,
      })
      .from(clientSettingsTable)
      .where(eq(clientSettingsTable.clientId, clientId))
      .limit(1);

    if (!row) {
      return null;
    }

    const { weightUnit, heightUnit, ...preferences } = row;

    return ClientSettings.reconstitute({
      ...preferences,
      unitPreference: { weightUnit, heightUnit },
    });
  }

  async saveUnits(settings: ClientSettings): Promise<void> {
    const { unitPreference, ...snapshot } = settings.toSnapshot();
    const units = { ...unitPreference, updatedAt: snapshot.updatedAt };

    await this.database
      .insert(clientSettingsTable)
      .values({ ...snapshot, ...unitPreference })
      .onConflictDoUpdate({ target: clientSettingsTable.clientId, set: units });
  }
}
