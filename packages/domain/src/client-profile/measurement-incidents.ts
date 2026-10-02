import type { AccountRole } from "../account";

import type { ProgressPhotoView } from "./progress-photo";

export type ProgressPhotoRefusal =
  "not-accepted" | "consent-missing" | "rendition-refused" | "storage-failed";

type MeasurementEntrySavedIncident = {
  clientId: string;
  entryId: string;
};

type ProgressPhotoStoredIncident = {
  clientId: string;
  entryId: string;
  view: ProgressPhotoView;
  receivedBytes: number;
  storedBytes: number;
};

type ProgressPhotoRefusedIncident = {
  clientId: string;
  entryId: string;
  view: ProgressPhotoView;
  receivedBytes: number;
  reason: ProgressPhotoRefusal;
};

type ProgressPhotoDeletedIncident = {
  clientId: string;
  entryId: string;
  photoId: string;
  view: ProgressPhotoView;
};

type ProgressPhotoAccessRefusedIncident = {
  requesterRole: AccountRole;
  photoId: string;
};

export interface MeasurementIncidents {
  measurementEntrySaved(incident: MeasurementEntrySavedIncident): void;
  progressPhotoStored(incident: ProgressPhotoStoredIncident): void;
  progressPhotoRefused(incident: ProgressPhotoRefusedIncident): void;
  progressPhotoDeleted(incident: ProgressPhotoDeletedIncident): void;
  progressPhotoAccessRefused(
    incident: ProgressPhotoAccessRefusedIncident,
  ): void;
}
