import type { DatabaseClient } from "~/shared/database";
import { executorOf } from "~/shared/database/index.server";
import {
  ClientSettings,
  type ClientSettingsChangesPort,
  type ClientSettingsSourcePort,
} from "~/bounded-contexts/clients/client-profile/domain/client-settings";
import { eq } from "drizzle-orm";

import { clientSettingsTable } from "~/bounded-contexts/clients/client-profile/adapters/outbound/persistence/schema.server";

export class PostgresClientSettingsRepository
  implements ClientSettingsSourcePort, ClientSettingsChangesPort
{
  constructor(private readonly database: DatabaseClient) {}

  private get executor() {
    return executorOf(this.database);
  }

  async findByClientId(clientId: string): Promise<ClientSettings | null> {
    const [row] = await this.executor
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

    await this.executor
      .insert(clientSettingsTable)
      .values({ ...snapshot, ...unitPreference })
      .onConflictDoUpdate({ target: clientSettingsTable.clientId, set: units });
  }
}
