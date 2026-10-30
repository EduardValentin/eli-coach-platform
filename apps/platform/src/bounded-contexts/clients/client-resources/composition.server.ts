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
  resourceDocumentPagesPort: ResourceDocumentPagesPort;
  resourceFileFormatDetectorPort: ResourceFileFormatDetectorPort;
  resourceImagePagesPort: ResourceImagePagesPort;
  clientResourceStorePort: ClientResourceStorePort;
};

type ClientResourcesFeatureHandles = ResourceFiles & {
  clientReachPort: ClientReachPort;
  clockPort: ClockPort;
  database: DatabaseClient;
  loggerPort: LoggerPort;
};

export function composeClientResourcesFeature(
  handles: ClientResourcesFeatureHandles,
): ClientResourcesFeature {
  const clientResourcesIncidentsAdapter = new ClientResourcesIncidentsAdapter(
    handles.loggerPort,
  );
  const accessPorts = {
    clientResourcesPort: new PostgresClientResourcesRepository(
      handles.database,
    ),
    clientReachPort: new ClientsClientReachAdapter(handles.clientReachPort),
    clientResourceIncidentsPort: clientResourcesIncidentsAdapter,
  };
  const servingPorts = {
    ...accessPorts,
    clientResourceStorePort: handles.clientResourceStorePort,
  };

  return {
    clientResourcesController: new ClientResourcesController({
      addClientResourceUseCase: new AddClientResourceUseCase({
        ...servingPorts,
        clientResourceIdsPort: new RandomClientResourceIdsAdapter(),
        resourceDocumentPagesPort: handles.resourceDocumentPagesPort,
        resourceImagePagesPort: handles.resourceImagePagesPort,
        resourceFileFormatDetectorPort: handles.resourceFileFormatDetectorPort,
        clockPort: handles.clockPort,
      }),
      openResourcePreviewUseCase: new OpenResourcePreviewUseCase(servingPorts),
      downloadClientResourceUseCase: new DownloadClientResourceUseCase(
        servingPorts,
      ),
      changeResourceDetailsUseCase: new ChangeResourceDetailsUseCase(
        accessPorts,
      ),
      removeClientResourceUseCase: new RemoveClientResourceUseCase(
        servingPorts,
      ),
    }),
    coachResourcesController: new CoachResourcesController({
      listClientResourcesUseCase: new ListClientResourcesUseCase(accessPorts),
    }),
    ownResourcesController: new OwnResourcesController({
      listOwnResourcesUseCase: new ListOwnResourcesUseCase(accessPorts),
      countUnopenedResourcesUseCase: new CountUnopenedResourcesUseCase(
        accessPorts,
      ),
      markResourceOpenedUseCase: new MarkResourceOpenedUseCase({
        ...accessPorts,
        clockPort: handles.clockPort,
      }),
    }),
  };
}

export function composeResourceFiles(locations: {
  documentPagesWorkerUrl: URL;
  resourceRoot: string;
}): ResourceFiles {
  return {
    resourceDocumentPagesPort: createResourceDocumentPagesAdapter({
      workerUrl: locations.documentPagesWorkerUrl,
      renditions: RESOURCE_RENDITIONS,
    }),
    resourceFileFormatDetectorPort: createResourceFileFormatDetectorAdapter(),
    resourceImagePagesPort:
      createResourceImagePagesAdapter(RESOURCE_RENDITIONS),
    clientResourceStorePort: createClientResourceStoreAdapter(
      locations.resourceRoot,
    ),
  };
}
