import type { DatabaseClient } from "~/shared/database";
import { executorOf } from "~/shared/database/index.server";
import type {
  ClientMeasurementEntry,
  ClientMeasurementRecordsPort,
  MeasurementRecord,
} from "~/bounded-contexts/clients/client-profile/domain/client-profile";
import { asc, eq } from "drizzle-orm";

import {
  MEASUREMENT_SELECTION,
  measurementEntryOfStored,
  measurementInsertOf,
  type StoredMeasurement,
} from "~/bounded-contexts/clients/client-profile/adapters/outbound/persistence/measurements/postgres-client-measurements-repository.server";
import {
  PROGRESS_PHOTO_SELECTION,
  progressPhotoSnapshotOf,
  type StoredProgressPhoto,
} from "~/bounded-contexts/clients/client-profile/adapters/outbound/persistence/photos/postgres-progress-photos-repository.server";
import {
  clientMeasurementsTable,
  clientProgressPhotosTable,
} from "~/bounded-contexts/clients/client-profile/adapters/outbound/persistence/schema.server";

export class PostgresClientMeasurementRecordsRepository implements ClientMeasurementRecordsPort {
  constructor(private readonly database: DatabaseClient) {}

  private get executor() {
    return executorOf(this.database);
  }

  async listByClientId(clientId: string): Promise<MeasurementRecord[]> {
    const rows = await this.executor
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
    await this.executor
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
