import type { DatabaseClient } from "@eli-coach-platform/db";
import {
  UnitPreference,
  type ClientUnitPreferences,
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

    return row ? UnitPreference.from(row) : null;
  }

  async save(input: {
    clientId: string;
    preference: UnitPreference;
    at: Date;
  }): Promise<void> {
    const units = { ...input.preference.toSnapshot(), updatedAt: input.at };

    await this.database
      .insert(clientUnitPreferencesTable)
      .values({ clientId: input.clientId, ...units })
      .onConflictDoUpdate({
        target: clientUnitPreferencesTable.clientId,
        set: units,
      });
  }
}
