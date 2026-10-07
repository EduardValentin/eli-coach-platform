import {
  ClientResourceAccess,
  type ResourceRequester,
} from "./client-resource-access";
import type { ClientResourceIncidents } from "./client-resource-incidents";
import type { ClientResourceStore } from "./client-resource-store";
import type { ClientResources } from "./client-resources";
import type { ResourceClients } from "./resource-clients";
import type { ResourceFileKind } from "./resource-file-kind";

type DownloadClientResourceCommand = {
  requester: ResourceRequester;
  resourceId: string;
};

export type DownloadClientResourceResult =
  | {
      status: "opened";
      bytes: AsyncIterable<Uint8Array>;
      sizeBytes: number;
      downloadName: string;
      kind: ResourceFileKind;
      mimeType: string;
    }
  | { status: "not-found" };

type DownloadClientResourceUseCaseOptions = {
  resources: ClientResources;
  clients: ResourceClients;
  store: ClientResourceStore;
  incidents: ClientResourceIncidents;
};

export class DownloadClientResourceUseCase {
  private readonly access: ClientResourceAccess;

  constructor(private readonly options: DownloadClientResourceUseCaseOptions) {
    this.access = new ClientResourceAccess(options);
  }

  async execute(
    command: DownloadClientResourceCommand,
  ): Promise<DownloadClientResourceResult> {
    const resource = await this.access.resourceFor(
      command.requester,
      command.resourceId,
    );

    if (!resource) return { status: "not-found" };

    const original = await this.options.store.openOriginal(
      resource.storageOwner(),
    );

    if (!original) return { status: "not-found" };

    const { file } = resource;

    return {
      status: "opened",
      bytes: original.bytes,
      sizeBytes: original.sizeBytes,
      downloadName: file.downloadName(),
      kind: file.kind,
      mimeType: file.mimeType,
    };
  }
}
