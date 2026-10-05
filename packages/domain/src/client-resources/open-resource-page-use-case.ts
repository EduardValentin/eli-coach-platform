import type { ClientResource } from "./client-resource";
import {
  ClientResourceAccess,
  type ResourceRequester,
} from "./client-resource-access";
import type { ClientResourceIncidents } from "./client-resource-incidents";
import type { ClientResourceStore } from "./client-resource-store";
import type { ClientResources } from "./client-resources";
import type { ResourceClients } from "./resource-clients";
import { RESOURCE_RENDITION_MIME_TYPE } from "./resource-renditions";

export type ResourcePreview =
  { kind: "page"; pageNumber: number } | { kind: "thumbnail" };

type OpenResourcePageCommand = {
  requester: ResourceRequester;
  resourceId: string;
  preview: ResourcePreview;
};

export type OpenResourcePageResult =
  | {
      status: "opened";
      bytes: Uint8Array;
      mimeType: typeof RESOURCE_RENDITION_MIME_TYPE;
    }
  | { status: "not-found" };

type OpenResourcePageUseCaseOptions = {
  resources: ClientResources;
  clients: ResourceClients;
  store: ClientResourceStore;
  incidents: ClientResourceIncidents;
};

export class OpenResourcePageUseCase {
  private readonly access: ClientResourceAccess;

  constructor(private readonly options: OpenResourcePageUseCaseOptions) {
    this.access = new ClientResourceAccess(options);
  }

  async execute(
    command: OpenResourcePageCommand,
  ): Promise<OpenResourcePageResult> {
    const resource = await this.access.resourceFor(
      command.requester,
      command.resourceId,
    );
    const bytes = resource
      ? await this.previewBytes(resource, command.preview)
      : null;

    if (!bytes) return { status: "not-found" };

    return { status: "opened", bytes, mimeType: RESOURCE_RENDITION_MIME_TYPE };
  }

  private async previewBytes(
    resource: ClientResource,
    preview: ResourcePreview,
  ): Promise<Uint8Array | null> {
    const owner = resource.storageOwner();

    if (preview.kind === "thumbnail") {
      return resource.file.hasPagePreview()
        ? this.options.store.openThumbnail(owner)
        : null;
    }

    return resource.file.hasPage(preview.pageNumber)
      ? this.options.store.openPage(owner, preview.pageNumber)
      : null;
  }
}
