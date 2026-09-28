import type { DatabaseClient } from "@eli-coach-platform/db";
import type {
  ClientUnitPreferences,
  UnitPreference,
} from "@eli-coach-platform/domain/unit-preference";
import { eq } from "drizzle-orm";

import { clientUnitPreferencesTable } from "~/features/client-onboarding/data/schema.server";

export class PostgresClientUnitPreferences implements ClientUnitPreferences {
  constructor(private readonly database: DatabaseClient) {}

  async findByClientId(clientId: string): Promise<UnitPreference | null> {
    const [row] = await this.database
      .select({
        weightUnit: clientUnitPreferencesTable.weightUnit,
        heightUnit: clientUnitPreferencesTable.heightUnit,
      })
      .from(clientUnitPreferencesTable)
      .where(eq(clientUnitPreferencesTable.clientId, clientId))
      .limit(1);

    return row ?? null;
  }

  async save(input: {
    clientId: string;
    preference: UnitPreference;
    at: Date;
  }): Promise<void> {
    const units = {
      weightUnit: input.preference.weightUnit,
      heightUnit: input.preference.heightUnit,
      updatedAt: input.at,
    };

    await this.database
      .insert(clientUnitPreferencesTable)
      .values({ clientId: input.clientId, ...units })
      .onConflictDoUpdate({
        target: clientUnitPreferencesTable.clientId,
        set: units,
      });
  }
}
