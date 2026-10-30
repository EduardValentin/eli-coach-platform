type ClientAvatarFileOrphanedIncident = {
  clientId: string;
  storageKey: string;
};

export interface ClientAvatarIncidentsPort {
  clientAvatarFileOrphaned(incident: ClientAvatarFileOrphanedIncident): void;
}
