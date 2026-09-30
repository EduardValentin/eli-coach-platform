import type { DatabaseClient } from "@eli-coach-platform/db";
import {
  ProgressPhoto,
  type ProgressPhotoSnapshot,
  type ProgressPhotoView,
  type ProgressPhotos,
} from "@eli-coach-platform/domain/client-profile";
import { eq } from "drizzle-orm";

import { clientProgressPhotosTable } from "~/features/client-profile/data/schema.server";

export type StoredProgressPhoto = {
  id: string;
  entryId: string;
  clientId: string;
  view: ProgressPhotoView;
  storageKey: string;
  keyId: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date;
};

export const PROGRESS_PHOTO_SELECTION = {
  id: clientProgressPhotosTable.id,
  entryId: clientProgressPhotosTable.entryId,
  clientId: clientProgressPhotosTable.clientId,
  view: clientProgressPhotosTable.view,
  storageKey: clientProgressPhotosTable.storageKey,
  keyId: clientProgressPhotosTable.keyId,
  mimeType: clientProgressPhotosTable.mimeType,
  sizeBytes: clientProgressPhotosTable.sizeBytes,
  createdAt: clientProgressPhotosTable.createdAt,
};

export class PostgresProgressPhotos implements ProgressPhotos {
  constructor(private readonly database: DatabaseClient) {}

  async add(photo: ProgressPhoto): Promise<void> {
    const { reference, ...columns } = photo.toSnapshot();

    await this.database
      .insert(clientProgressPhotosTable)
      .values({ ...columns, ...reference });
  }

  async findById(photoId: string): Promise<ProgressPhoto | null> {
    const [row] = await this.database
      .select(PROGRESS_PHOTO_SELECTION)
      .from(clientProgressPhotosTable)
      .where(eq(clientProgressPhotosTable.id, photoId))
      .limit(1);

    return row
      ? ProgressPhoto.reconstitute(progressPhotoSnapshotOf(row))
      : null;
  }

  async delete(photoId: string): Promise<void> {
    await this.database
      .delete(clientProgressPhotosTable)
      .where(eq(clientProgressPhotosTable.id, photoId));
  }
}

export function progressPhotoSnapshotOf({
  storageKey,
  keyId,
  ...columns
}: StoredProgressPhoto): ProgressPhotoSnapshot {
  return { ...columns, reference: { storageKey, keyId } };
}
