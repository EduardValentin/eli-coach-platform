type ResourceClient = { clientId: string; portal: "open" | "closed" };

export interface ResourceClients {
  exists(clientId: string): Promise<boolean>;
  findByAuthSubjectId(authSubjectId: string): Promise<ResourceClient | null>;
}
