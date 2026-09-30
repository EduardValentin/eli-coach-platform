type UnitPreferenceClient = { clientId: string };

export interface UnitPreferenceClients {
  findByAuthSubjectId(
    authSubjectId: string,
  ): Promise<UnitPreferenceClient | null>;
}
