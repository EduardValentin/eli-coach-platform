import type { DatabaseClient } from "~/shared/database";
import { executorOf } from "~/shared/database/index.server";
import type { ClientMeasurementEntry } from "~/bounded-contexts/clients/client-profile/domain/client-profile";
import {
  measurementEntryOf,
  type ClientMeasurementsSource,
  type MeasurementEntry,
} from "~/bounded-contexts/clients/client-profile/domain/measurement";
import { asc, eq } from "drizzle-orm";

import { clientMeasurementsTable } from "~/bounded-contexts/clients/client-profile/adapters/outbound/persistence/schema.server";

export type StoredMeasurement = {
  recordedAt: Date;
  weightKg: number;
  waistCm: number;
  hipsCm: number | null;
  thighCm: number | null;
  armCm: number | null;
};

export const MEASUREMENT_SELECTION = {
  recordedAt: clientMeasurementsTable.recordedAt,
  weightKg: clientMeasurementsTable.weightKg,
  waistCm: clientMeasurementsTable.waistCm,
  hipsCm: clientMeasurementsTable.hipsCm,
  thighCm: clientMeasurementsTable.thighCm,
  armCm: clientMeasurementsTable.armCm,
};

export class PostgresClientMeasurements implements ClientMeasurementsSource {
  constructor(private readonly database: DatabaseClient) {}

  private get executor() {
    return executorOf(this.database);
  }

  async listByClientId(clientId: string): Promise<MeasurementEntry[]> {
    const rows = await this.executor
      .select(MEASUREMENT_SELECTION)
      .from(clientMeasurementsTable)
      .where(eq(clientMeasurementsTable.clientId, clientId))
      .orderBy(asc(clientMeasurementsTable.recordedAt));

    return rows.flatMap((row) => {
      const entry = measurementEntryOfStored(row);

      return entry ? [entry] : [];
    });
  }
}

export async function recordMeasurementEntry(
  database: DatabaseClient,
  record: ClientMeasurementEntry,
): Promise<void> {
  await executorOf(database)
    .insert(clientMeasurementsTable)
    .values(measurementInsertOf(record));
}

export function measurementEntryOfStored(
  stored: StoredMeasurement,
): MeasurementEntry | null {
  return measurementEntryOf(
    {
      weightKg: stored.weightKg,
      waistCm: stored.waistCm,
      hipsCm: stored.hipsCm ?? undefined,
      thighCm: stored.thighCm ?? undefined,
      armCm: stored.armCm ?? undefined,
    },
    stored.recordedAt,
  );
}

export function measurementInsertOf({
  clientId,
  entryId,
  entry,
}: ClientMeasurementEntry): typeof clientMeasurementsTable.$inferInsert {
  return {
    id: entryId,
    clientId,
    recordedAt: entry.recordedAt,
    weightKg: entry.weightKg,
    waistCm: entry.waistCm,
    hipsCm: entry.hipsCm ?? null,
    thighCm: entry.thighCm ?? null,
    armCm: entry.armCm ?? null,
  };
}
