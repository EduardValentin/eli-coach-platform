import type { ClientResource } from "./client-resource";

export interface ClientResources {
  add(resource: ClientResource): Promise<void>;
  listForClient(clientId: string): Promise<ClientResource[]>;
  findById(resourceId: string): Promise<ClientResource | null>;
  recordOpened(resource: ClientResource): Promise<void>;
  saveDetails(resource: ClientResource): Promise<void>;
  remove(resourceId: string): Promise<void>;
  countUnopenedForClient(clientId: string): Promise<number>;
}
