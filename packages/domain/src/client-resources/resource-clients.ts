type ResourceClient = { clientId: string };

export interface ResourceClients {
  exists(clientId: string): Promise<boolean>;
  findByAuthSubjectId(authSubjectId: string): Promise<ResourceClient | null>;
}
