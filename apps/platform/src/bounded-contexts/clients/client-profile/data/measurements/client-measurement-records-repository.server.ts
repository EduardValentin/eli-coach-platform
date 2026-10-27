import type { DatabaseClient } from "~/shared/database";
import type {
  ClientMeasurementEntry,
  ClientMeasurementRecords,
  MeasurementRecord,
} from "~/bounded-contexts/clients/client-profile/domain/client-profile";
import { asc, eq } from "drizzle-orm";

import {
  MEASUREMENT_SELECTION,
  measurementEntryOfStored,
  measurementInsertOf,
  type StoredMeasurement,
} from "~/bounded-contexts/clients/client-profile/data/measurements/client-measurements-repository.server";
import {
  PROGRESS_PHOTO_SELECTION,
  progressPhotoSnapshotOf,
  type StoredProgressPhoto,
} from "~/bounded-contexts/clients/client-profile/data/photos/client-progress-photos-repository.server";
import {
  clientMeasurementsTable,
  clientProgressPhotosTable,
} from "~/bounded-contexts/clients/client-profile/data/schema.server";

export class PostgresClientMeasurementRecords implements ClientMeasurementRecords {
  constructor(private readonly database: DatabaseClient) {}

  async listByClientId(clientId: string): Promise<MeasurementRecord[]> {
    const rows = await this.database
      .select({
        id: clientMeasurementsTable.id,
        ...MEASUREMENT_SELECTION,
        photo: PROGRESS_PHOTO_SELECTION,
      })
      .from(clientMeasurementsTable)
      .leftJoin(
        clientProgressPhotosTable,
        eq(clientProgressPhotosTable.entryId, clientMeasurementsTable.id),
      )
      .where(eq(clientMeasurementsTable.clientId, clientId))
      .orderBy(
        asc(clientMeasurementsTable.recordedAt),
        asc(clientProgressPhotosTable.view),
      );

    return recordsWithTheirPhotos(rows);
  }

  async record(record: ClientMeasurementEntry): Promise<void> {
    await this.database
      .insert(clientMeasurementsTable)
      .values(measurementInsertOf(record));
  }
}

type StoredMeasurementWithPhoto = StoredMeasurement & {
  id: string;
  photo: StoredProgressPhoto | null;
};

function recordsWithTheirPhotos(
  rows: readonly StoredMeasurementWithPhoto[],
): MeasurementRecord[] {
  const records = new Map<string, MeasurementRecord>();

  for (const row of rows) {
    const record = records.get(row.id) ?? recordOf(row);

    if (!record) {
      continue;
    }

    if (row.photo) {
      record.photos.push(progressPhotoSnapshotOf(row.photo));
    }

    records.set(row.id, record);
  }

  return [...records.values()];
}

function recordOf(row: StoredMeasurementWithPhoto): MeasurementRecord | null {
  const entry = measurementEntryOfStored(row);

  return entry ? { id: row.id, ...entry, photos: [] } : null;
}
