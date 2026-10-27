type ClientAvatarFileOrphanedIncident = {
  clientId: string;
  storageKey: string;
};

export interface ClientAvatarIncidents {
  clientAvatarFileOrphaned(incident: ClientAvatarFileOrphanedIncident): void;
}
