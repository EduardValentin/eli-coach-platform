import type { ClientResource } from "./client-resource";

export interface ClientResources {
  add(resource: ClientResource): Promise<void>;
  listForClient(clientId: string): Promise<ClientResource[]>;
  findById(resourceId: string): Promise<ClientResource | null>;
  recordOpened(resource: ClientResource): Promise<void>;
  countUnopenedForClient(clientId: string): Promise<number>;
}
