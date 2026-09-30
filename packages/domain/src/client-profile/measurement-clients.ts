type MeasurementClient = { clientId: string };

export interface MeasurementClients {
  findByAuthSubjectId(authSubjectId: string): Promise<MeasurementClient | null>;
}
