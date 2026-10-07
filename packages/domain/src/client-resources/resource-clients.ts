type ResourceClient = { clientId: string; portal: "reachable" | "unreachable" };

export interface ResourceClients {
  exists(clientId: string): Promise<boolean>;
  findByAuthSubjectId(authSubjectId: string): Promise<ResourceClient | null>;
}
