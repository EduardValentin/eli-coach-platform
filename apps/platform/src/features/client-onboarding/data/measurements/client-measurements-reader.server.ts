import type { DatabaseClient } from "@eli-coach-platform/db";
import {
  measurementEntryOf,
  type ClientMeasurementsSource,
  type MeasurementEntry,
} from "@eli-coach-platform/domain/measurement";
import { asc, eq } from "drizzle-orm";

import { clientMeasurementsTable } from "~/features/client-onboarding/data/schema.server";

export class PostgresClientMeasurements implements ClientMeasurementsSource {
  constructor(private readonly database: DatabaseClient) {}

  async listByClientId(clientId: string): Promise<MeasurementEntry[]> {
    const rows = await this.database
      .select({
        recordedAt: clientMeasurementsTable.recordedAt,
        weightKg: clientMeasurementsTable.weightKg,
        waistCm: clientMeasurementsTable.waistCm,
        hipsCm: clientMeasurementsTable.hipsCm,
        thighCm: clientMeasurementsTable.thighCm,
        armCm: clientMeasurementsTable.armCm,
      })
      .from(clientMeasurementsTable)
      .where(eq(clientMeasurementsTable.clientId, clientId))
      .orderBy(asc(clientMeasurementsTable.recordedAt));

    return rows.flatMap((row) => {
      const entry = measurementEntryOf(
        {
          weightKg: row.weightKg,
          waistCm: row.waistCm,
          hipsCm: row.hipsCm ?? undefined,
          thighCm: row.thighCm ?? undefined,
          armCm: row.armCm ?? undefined,
        },
        row.recordedAt,
      );

      return entry ? [entry] : [];
    });
  }
}
