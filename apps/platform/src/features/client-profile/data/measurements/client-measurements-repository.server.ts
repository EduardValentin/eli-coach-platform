import type {
  DatabaseClient,
  DatabaseTransaction,
} from "@eli-coach-platform/db";
import {
  measurementEntryOf,
  type ClientMeasurementsSource,
  type MeasurementEntry,
} from "@eli-coach-platform/domain/measurement";
import { asc, eq } from "drizzle-orm";

import { clientMeasurementsTable } from "~/features/client-profile/data/schema.server";

export type MeasurementColumns = {
  recordedAt: Date;
  weightKg: number;
  waistCm: number;
  hipsCm: number | null;
  thighCm: number | null;
  armCm: number | null;
};

export const MEASUREMENT_COLUMNS = {
  recordedAt: clientMeasurementsTable.recordedAt,
  weightKg: clientMeasurementsTable.weightKg,
  waistCm: clientMeasurementsTable.waistCm,
  hipsCm: clientMeasurementsTable.hipsCm,
  thighCm: clientMeasurementsTable.thighCm,
  armCm: clientMeasurementsTable.armCm,
};

export class PostgresClientMeasurements implements ClientMeasurementsSource {
  constructor(private readonly database: DatabaseClient) {}

  async listByClientId(clientId: string): Promise<MeasurementEntry[]> {
    const rows = await this.database
      .select(MEASUREMENT_COLUMNS)
      .from(clientMeasurementsTable)
      .where(eq(clientMeasurementsTable.clientId, clientId))
      .orderBy(asc(clientMeasurementsTable.recordedAt));

    return rows.flatMap((row) => {
      const entry = measurementEntryFromColumns(row);

      return entry ? [entry] : [];
    });
  }
}

export async function recordMeasurementEntry(
  transaction: DatabaseTransaction,
  input: { clientId: string; entry: MeasurementEntry },
): Promise<void> {
  await transaction
    .insert(clientMeasurementsTable)
    .values(measurementRowOf(input.clientId, input.entry));
}

export function measurementEntryFromColumns(
  columns: MeasurementColumns,
): MeasurementEntry | null {
  return measurementEntryOf(
    {
      weightKg: columns.weightKg,
      waistCm: columns.waistCm,
      hipsCm: columns.hipsCm ?? undefined,
      thighCm: columns.thighCm ?? undefined,
      armCm: columns.armCm ?? undefined,
    },
    columns.recordedAt,
  );
}

export function measurementRowOf(clientId: string, entry: MeasurementEntry) {
  return {
    clientId,
    recordedAt: entry.recordedAt,
    weightKg: entry.weightKg,
    waistCm: entry.waistCm,
    hipsCm: entry.hipsCm ?? null,
    thighCm: entry.thighCm ?? null,
    armCm: entry.armCm ?? null,
  };
}
