import type { DatabaseClient } from "@eli-coach-platform/db";
import type {
  ClientMeasurementRecords,
  MeasurementRecord,
} from "@eli-coach-platform/domain/client-profile";
import type { MeasurementEntry } from "@eli-coach-platform/domain/measurement";
import { asc, eq } from "drizzle-orm";

import {
  MEASUREMENT_SELECTION,
  measurementEntryOfStored,
  measurementInsertOf,
  type StoredMeasurement,
} from "~/features/client-profile/data/measurements/client-measurements-repository.server";
import {
  PROGRESS_PHOTO_SELECTION,
  progressPhotoSnapshotOf,
  type StoredProgressPhoto,
} from "~/features/client-profile/data/photos/client-progress-photos-repository.server";
import {
  clientMeasurementsTable,
  clientProgressPhotosTable,
} from "~/features/client-profile/data/schema.server";

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

  async record(clientId: string, entry: MeasurementEntry): Promise<string> {
    const [inserted] = await this.database
      .insert(clientMeasurementsTable)
      .values(measurementInsertOf(clientId, entry))
      .returning({ id: clientMeasurementsTable.id });

    if (!inserted) {
      throw new Error("The measurement entry was not recorded.");
    }

    return inserted.id;
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
