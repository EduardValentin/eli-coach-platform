import type { ProgressPhotoView } from "@eli-coach-platform/domain/client-profile";
import type pg from "pg";

export type MeasurementEntryRecord = {
  recordedAt: Date;
  weightKg: string;
  waistCm: string;
  hipsCm: string | null;
  thighCm: string | null;
  armCm: string | null;
};

export type ProgressPhotoRecord = {
  view: ProgressPhotoView;
  mimeType: string;
};

const ENTRIES = `
  select
    recorded_at as "recordedAt",
    weight_kg as "weightKg",
    waist_cm as "waistCm",
    hips_cm as "hipsCm",
    thigh_cm as "thighCm",
    arm_cm as "armCm"
  from app.client_measurements
  where client_id = $1
  order by recorded_at
`;

const PHOTOS = `
  select view, mime_type as "mimeType"
  from app.client_progress_photos
  where client_id = $1
  order by view
`;

const PHOTO_ID_BY_VIEW = `
  select id
  from app.client_progress_photos
  where client_id = $1 and view = $2
`;

const PHOTOS_CONSENTED_AT = `
  select progress_photos_consented_at as "consentedAt"
  from app.client_profiles
  where client_id = $1
`;

export class MeasurementRecords {
  constructor(private readonly pool: pg.Pool) {}

  async entries(clientId: string): Promise<MeasurementEntryRecord[]> {
    const { rows } = await this.pool.query<MeasurementEntryRecord>(ENTRIES, [
      clientId,
    ]);

    return rows;
  }

  async photos(clientId: string): Promise<ProgressPhotoRecord[]> {
    const { rows } = await this.pool.query<ProgressPhotoRecord>(PHOTOS, [
      clientId,
    ]);

    return rows;
  }

  async photoIdOf(clientId: string, view: ProgressPhotoView): Promise<string> {
    const { rows } = await this.pool.query<{ id: string }>(PHOTO_ID_BY_VIEW, [
      clientId,
      view,
    ]);
    const [photo] = rows;

    if (!photo) {
      throw new Error(`Client ${clientId} has no stored ${view} photo.`);
    }

    return photo.id;
  }

  async photosConsentedAt(clientId: string): Promise<Date | null> {
    const { rows } = await this.pool.query<{ consentedAt: Date | null }>(
      PHOTOS_CONSENTED_AT,
      [clientId],
    );

    return rows[0]?.consentedAt ?? null;
  }
}
