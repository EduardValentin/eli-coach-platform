import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import type { AccountSession, PlatformRig } from "./platform-rig";

export type ProgressPhotoView = "front" | "side" | "back";

export type MeasurementValues = {
  weightKg: number;
  waistCm: number;
  hipsCm?: number;
  thighCm?: number;
  armCm?: number;
};

export type PhotoPart = {
  bytes: Buffer;
  fileName: string;
  mimeType: string;
};

export type MeasurementsRecording = {
  values: MeasurementValues;
  photos?: Partial<Record<ProgressPhotoView, PhotoPart>>;
  consent?: "given";
};

export type RecordedMeasurements = {
  entryId: string;
  photos: Record<ProgressPhotoView, "stored" | "refused" | "absent">;
};

export type MeasurementEntryRow = {
  id: string;
  recordedAt: Date;
  weightKg: string;
  waistCm: string;
  hipsCm: string | null;
};

export type ProgressPhotoRow = {
  id: string;
  entryId: string;
  view: ProgressPhotoView;
  storageKey: string;
  keyId: string;
  mimeType: string;
  sizeBytes: number;
};

export const MEASUREMENTS_API = "/api/client-profile/measurements";
export const PHOTOS_API = "/api/client-profile/photos";

export class MeasurementsJourney {
  constructor(private readonly rig: PlatformRig) {}

  async recordMeasurements(
    session: AccountSession,
    recording: MeasurementsRecording,
  ): Promise<Response> {
    return this.rig.requestAs(session, MEASUREMENTS_API, {
      body: measurementsForm(recording),
      method: "POST",
    });
  }

  async recordMeasurementsAnonymously(
    recording: MeasurementsRecording,
  ): Promise<Response> {
    return this.rig.suite.request(
      new Request(this.rig.suite.url(MEASUREMENTS_API), {
        body: measurementsForm(recording),
        method: "POST",
      }),
    );
  }

  async recordAccepted(
    session: AccountSession,
    recording: MeasurementsRecording,
  ): Promise<RecordedMeasurements> {
    const response = await this.recordMeasurements(session, recording);

    if (response.status !== 201) {
      throw new Error(
        `Recording her measurements answered ${response.status}.`,
      );
    }

    return (await response.json()) as RecordedMeasurements;
  }

  async openPhoto(session: AccountSession, photoId: string): Promise<Response> {
    return this.rig.requestAs(session, `${PHOTOS_API}/${photoId}`);
  }

  async openPhotoAnonymously(photoId: string): Promise<Response> {
    return this.rig.suite.request(
      new Request(this.rig.suite.url(`${PHOTOS_API}/${photoId}`)),
    );
  }

  async removePhoto(
    session: AccountSession,
    photoId: string,
  ): Promise<Response> {
    return this.rig.requestAs(session, `${PHOTOS_API}/${photoId}`, {
      method: "DELETE",
    });
  }

  async removePhotoAnonymously(photoId: string): Promise<Response> {
    return this.rig.suite.request(
      new Request(this.rig.suite.url(`${PHOTOS_API}/${photoId}`), {
        method: "DELETE",
      }),
    );
  }

  async entryRowsOf(clientId: string): Promise<MeasurementEntryRow[]> {
    return this.rig.suite.postgres.queryRows<MeasurementEntryRow>({
      sql: 'select id, recorded_at as "recordedAt", weight_kg as "weightKg", waist_cm as "waistCm", hips_cm as "hipsCm" from app.client_measurements where client_id = $1 order by recorded_at',
      values: [clientId],
    });
  }

  async photoRowsOf(clientId: string): Promise<ProgressPhotoRow[]> {
    return this.rig.suite.postgres.queryRows<ProgressPhotoRow>({
      sql: 'select id, entry_id as "entryId", view, storage_key as "storageKey", key_id as "keyId", mime_type as "mimeType", size_bytes as "sizeBytes" from app.client_progress_photos where client_id = $1 order by view',
      values: [clientId],
    });
  }

  async photoConsentOf(clientId: string): Promise<Date | null> {
    const [profile] = await this.rig.suite.postgres.queryRows<{
      consentedAt: Date | null;
    }>({
      sql: 'select progress_photos_consented_at as "consentedAt" from app.client_profiles where client_id = $1',
      values: [clientId],
    });

    if (!profile) {
      throw new Error("No client profile exists for that client.");
    }

    return profile.consentedAt;
  }

  async storedFileOf(photo: ProgressPhotoRow): Promise<Buffer | null> {
    return readFile(join(this.rig.suite.mediaRoot(), photo.storageKey)).catch(
      whenMissing(null),
    );
  }

  async storedFileCountOf(clientId: string): Promise<number> {
    const files = await readdir(join(this.rig.suite.mediaRoot(), clientId), {
      recursive: true,
      withFileTypes: true,
    }).catch(whenMissing([]));

    return files.filter((file) => file.isFile()).length;
  }
}

function whenMissing<T>(fallback: T): (error: unknown) => T {
  return (error) => {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }

    return fallback;
  };
}

function measurementsForm(recording: MeasurementsRecording): FormData {
  const form = new FormData();
  form.set("entry", JSON.stringify(recording.values));

  if (recording.consent) {
    form.set("photoConsent", recording.consent);
  }

  for (const [view, photo] of Object.entries(recording.photos ?? {})) {
    form.set(
      view,
      new File([new Uint8Array(photo.bytes)], photo.fileName, {
        type: photo.mimeType,
      }),
    );
  }

  return form;
}
