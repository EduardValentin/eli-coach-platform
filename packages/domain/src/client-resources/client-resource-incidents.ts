import type { AccountRole } from "../account";

import type { ResourceFileFormat } from "./resource-file-kind";
import type { ResourceRefusal } from "./resource-file-intake";

type ClientResourceStoredIncident = {
  clientId: string;
  resourceId: string;
  format: ResourceFileFormat;
  sizeBytes: number;
  pageCount: number | null;
};

type ClientResourceRefusedIncident = {
  clientId: string;
  receivedBytes: number;
  reason: ResourceRefusal;
};

type ClientResourceAccessRefusedIncident = {
  requesterRole: AccountRole;
  clientId: string;
  resourceId: string | null;
};

type ClientResourceStorageFailedIncident = {
  clientId: string;
  resourceId: string;
  error: unknown;
};

type ClientResourceListingFailedIncident = {
  clientId: string;
  error: unknown;
};

export interface ClientResourceIncidents {
  resourceStored(incident: ClientResourceStoredIncident): void;
  resourceRefused(incident: ClientResourceRefusedIncident): void;
  resourceAccessRefused(incident: ClientResourceAccessRefusedIncident): void;
  resourceStorageFailed(incident: ClientResourceStorageFailedIncident): void;
  resourceListingFailed(incident: ClientResourceListingFailedIncident): void;
}
