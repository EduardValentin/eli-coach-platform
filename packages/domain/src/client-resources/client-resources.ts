import type { ClientResource } from "./client-resource";
import type { ResourceBrowseSnapshot } from "./resource-browse";
import type { ResourceTagSnapshot } from "./resource-tags";

export type TagOption = { tag: ResourceTagSnapshot; count: number };

export type BrowsedResources = {
  resources: ClientResource[];
  tagOptions: TagOption[];
  searched: number;
  total: number;
};

export interface ClientResources {
  add(resource: ClientResource): Promise<void>;
  browseForClient(
    clientId: string,
    browse: ResourceBrowseSnapshot,
  ): Promise<BrowsedResources>;
  tagsHeldBy(clientId: string): Promise<ResourceTagSnapshot[]>;
  tagVocabulary(): Promise<ResourceTagSnapshot[]>;
  findById(resourceId: string): Promise<ClientResource | null>;
  recordOpened(resource: ClientResource): Promise<void>;
  saveDetails(resource: ClientResource): Promise<void>;
  remove(resourceId: string): Promise<void>;
  countUnopenedForClient(clientId: string): Promise<number>;
}
