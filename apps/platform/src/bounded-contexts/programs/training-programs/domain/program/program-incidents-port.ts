type ProgramStartFailedIncident = {
  clientId: string;
  error: unknown;
};

export interface ProgramIncidentsPort {
  programStartFailed(incident: ProgramStartFailedIncident): void;
}
