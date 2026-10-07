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

type OpenResourcePreviewCommand = {
  requester: ResourceRequester;
  resourceId: string;
  preview: ResourcePreview;
};

export type OpenResourcePreviewResult =
  | {
      status: "opened";
      bytes: Uint8Array;
      mimeType: typeof RESOURCE_RENDITION_MIME_TYPE;
    }
  | { status: "not-found" };

type OpenResourcePreviewUseCaseOptions = {
  resources: ClientResources;
  clients: ResourceClients;
  store: ClientResourceStore;
  incidents: ClientResourceIncidents;
};

export class OpenResourcePreviewUseCase {
  private readonly access: ClientResourceAccess;

  constructor(private readonly options: OpenResourcePreviewUseCaseOptions) {
    this.access = new ClientResourceAccess(options);
  }

  async execute(
    command: OpenResourcePreviewCommand,
  ): Promise<OpenResourcePreviewResult> {
    const resource = await this.access.resourceFor(
      command.requester,
      command.resourceId,
    );

    if (!resource) return { status: "not-found" };

    const bytes = await this.previewBytes(resource, command.preview);

    if (!bytes) return { status: "not-found" };

    return { status: "opened", bytes, mimeType: RESOURCE_RENDITION_MIME_TYPE };
  }

  private async previewBytes(
    resource: ClientResource,
    preview: ResourcePreview,
  ): Promise<Uint8Array | null> {
    const owner = resource.storageOwner();

    if (preview.kind === "thumbnail") {
      if (!resource.file.hasPagePreview()) return null;

      return this.options.store.openThumbnail(owner);
    }

    if (!resource.file.hasPage(preview.pageNumber)) return null;

    return this.options.store.openPage(owner, preview.pageNumber);
  }
}
