import type { DatabaseClient } from "@eli-coach-platform/db";
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
  type ClientResourceIncidents,
  type ClientResourceStore,
  type ResourceClients,
  type ResourceDocumentPages,
  type ResourceFileFormatDetector,
  type ResourceImagePages,
} from "@eli-coach-platform/domain/client-resources";
import type { Clock } from "@eli-coach-platform/domain/shared";

import { OwnResourcesController } from "~/features/client-resources/api/client/own-resources-controller.server";
import { CoachResourcesController } from "~/features/client-resources/api/coach/coach-resources-controller.server";
import { ClientResourcesController } from "~/features/client-resources/api/resources/client-resources-controller.server";
import { PostgresClientResources } from "~/features/client-resources/data/resources/client-resources-repository.server";
import { RandomClientResourceIds } from "~/features/client-resources/data/resources/random-client-resource-ids.server";

export type ClientResourcesFeature = {
  clientResources: ClientResourcesController;
  coachResources: CoachResourcesController;
  ownResources: OwnResourcesController;
};

type ClientResourcesFeatureHandles = {
  clock: Clock;
  database: DatabaseClient;
  documentPages: ResourceDocumentPages;
  fileFormats: ResourceFileFormatDetector;
  imagePages: ResourceImagePages;
  incidents: ClientResourceIncidents;
  resourceClients: ResourceClients;
  store: ClientResourceStore;
};

export function composeClientResourcesFeature(
  handles: ClientResourcesFeatureHandles,
): ClientResourcesFeature {
  const accessPorts = {
    resources: new PostgresClientResources(handles.database),
    clients: handles.resourceClients,
    incidents: handles.incidents,
  };
  const servingPorts = { ...accessPorts, store: handles.store };

  return {
    clientResources: new ClientResourcesController({
      addClientResource: new AddClientResourceUseCase({
        ...servingPorts,
        resourceIds: new RandomClientResourceIds(),
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
