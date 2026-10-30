import type { DatabaseClient } from "~/shared/database";
import { executorOf } from "~/shared/database/index.server";
import {
  ProgressPhoto,
  type ProgressPhotoSnapshot,
  type ProgressPhotoView,
  type ProgressPhotosPort,
} from "~/bounded-contexts/clients/client-profile/domain/client-profile";
import { eq } from "drizzle-orm";

import { clientProgressPhotosTable } from "~/bounded-contexts/clients/client-profile/adapters/outbound/persistence/schema.server";

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

export class PostgresProgressPhotosRepository implements ProgressPhotosPort {
  constructor(private readonly database: DatabaseClient) {}

  private get executor() {
    return executorOf(this.database);
  }

  async add(photo: ProgressPhoto): Promise<void> {
    const { reference, ...columns } = photo.toSnapshot();

    await this.executor
      .insert(clientProgressPhotosTable)
      .values({ ...columns, ...reference });
  }

  async findById(photoId: string): Promise<ProgressPhoto | null> {
    const [row] = await this.executor
      .select(PROGRESS_PHOTO_SELECTION)
      .from(clientProgressPhotosTable)
      .where(eq(clientProgressPhotosTable.id, photoId))
      .limit(1);

    return row
      ? ProgressPhoto.reconstitute(progressPhotoSnapshotOf(row))
      : null;
  }

  async delete(photoId: string): Promise<void> {
    await this.executor
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
