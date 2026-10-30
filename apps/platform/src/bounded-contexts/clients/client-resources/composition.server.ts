import type { DatabaseClient } from "~/shared/database";
import {
  AddClientResourceUseCase,
  ChangeResourceDetailsUseCase,
  CountUnopenedResourcesUseCase,
  DownloadClientResourceUseCase,
  ListClientResourcesUseCase,
  ListOwnResourcesUseCase,
  MarkResourceOpenedUseCase,
  OpenResourcePreviewUseCase,
  RemoveClientResourceUseCase,
  RESOURCE_RENDITIONS,
  type ClientResourceStorePort,
  type ResourceDocumentPagesPort,
  type ResourceFileFormatDetectorPort,
  type ResourceImagePagesPort,
} from "~/bounded-contexts/clients/client-resources/domain/client-resources";
import type { ClientReachPort } from "~/bounded-contexts/clients/clients/public";
import type { ClockPort } from "~/bounded-contexts/clients/client-resources/domain/clock-port";

import { OwnResourcesController } from "~/bounded-contexts/clients/client-resources/adapters/inbound/http/client/own-resources-controller.server";
import { CoachResourcesController } from "~/bounded-contexts/clients/client-resources/adapters/inbound/http/coach/coach-resources-controller.server";
import { ClientResourcesController } from "~/bounded-contexts/clients/client-resources/adapters/inbound/http/resources/client-resources-controller.server";
import { PostgresClientResourcesRepository } from "~/bounded-contexts/clients/client-resources/adapters/outbound/persistence/resources/postgres-client-resources-repository.server";
import { RandomClientResourceIdsAdapter } from "~/bounded-contexts/clients/client-resources/adapters/outbound/persistence/resources/random-client-resource-ids-adapter.server";
import { ClientsClientReachAdapter } from "~/bounded-contexts/clients/client-resources/adapters/outbound/clients/clients-client-reach-adapter.server";
import type { ClientResourcesFeature } from "~/bounded-contexts/clients/client-resources/adapters/inbound/http/context.server";
import type { LoggerPort } from "~/shared/logging/logger-port.server";
import { ClientResourcesIncidentsAdapter } from "~/bounded-contexts/clients/client-resources/adapters/outbound/logging/client-resources-incidents-adapter.server";
import { createClientResourceStoreAdapter } from "~/bounded-contexts/clients/client-resources/adapters/outbound/persistence/create-client-resource-store-adapter.server";
import { createResourceDocumentPagesAdapter } from "./adapters/outbound/persistence/create-resource-document-pages-adapter.server";
import { createResourceFileFormatDetectorAdapter } from "~/bounded-contexts/clients/client-resources/adapters/outbound/persistence/create-resource-file-format-detector-adapter.server";
import { createResourceImagePagesAdapter } from "./adapters/outbound/persistence/create-resource-image-pages-adapter.server";

type ResourceFiles = {
  documentPages: ResourceDocumentPagesPort;
  fileFormats: ResourceFileFormatDetectorPort;
  imagePages: ResourceImagePagesPort;
  store: ClientResourceStorePort;
};

type ClientResourcesFeatureHandles = ResourceFiles & {
  clientReach: ClientReachPort;
  clock: ClockPort;
  database: DatabaseClient;
  logger: LoggerPort;
};

export function composeClientResourcesFeature(
  handles: ClientResourcesFeatureHandles,
): ClientResourcesFeature {
  const incidents = new ClientResourcesIncidentsAdapter(handles.logger);
  const accessPorts = {
    resources: new PostgresClientResourcesRepository(handles.database),
    clients: new ClientsClientReachAdapter(handles.clientReach),
    incidents,
  };
  const servingPorts = { ...accessPorts, store: handles.store };

  return {
    clientResources: new ClientResourcesController({
      addClientResource: new AddClientResourceUseCase({
        ...servingPorts,
        resourceIds: new RandomClientResourceIdsAdapter(),
        documentPages: handles.documentPages,
        imagePages: handles.imagePages,
        fileFormats: handles.fileFormats,
        clock: handles.clock,
      }),
      openResourcePreview: new OpenResourcePreviewUseCase(servingPorts),
      downloadClientResource: new DownloadClientResourceUseCase(servingPorts),
      changeResourceDetails: new ChangeResourceDetailsUseCase(accessPorts),
      removeClientResource: new RemoveClientResourceUseCase(servingPorts),
    }),
    coachResources: new CoachResourcesController({
      listClientResources: new ListClientResourcesUseCase(accessPorts),
    }),
    ownResources: new OwnResourcesController({
      listOwnResources: new ListOwnResourcesUseCase(accessPorts),
      countUnopenedResources: new CountUnopenedResourcesUseCase(accessPorts),
      markResourceOpened: new MarkResourceOpenedUseCase({
        ...accessPorts,
        clock: handles.clock,
      }),
    }),
  };
}

export function composeResourceFiles(locations: {
  documentPagesWorkerUrl: URL;
  resourceRoot: string;
}): ResourceFiles {
  return {
    documentPages: createResourceDocumentPagesAdapter({
      workerUrl: locations.documentPagesWorkerUrl,
      renditions: RESOURCE_RENDITIONS,
    }),
    fileFormats: createResourceFileFormatDetectorAdapter(),
    imagePages: createResourceImagePagesAdapter(RESOURCE_RENDITIONS),
    store: createClientResourceStoreAdapter(locations.resourceRoot),
  };
}
