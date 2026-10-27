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
  type ClientResourceIncidents,
  type ClientResourceStore,
  type ResourceDocumentPages,
  type ResourceFileFormatDetector,
  type ResourceImagePages,
} from "~/bounded-contexts/clients/client-resources/domain/client-resources";
import type { ClientReach } from "~/bounded-contexts/clients/clients/domain/client";
import type { Clock } from "~/bounded-contexts/clients/client-resources/domain/clock";

import { OwnResourcesController } from "~/bounded-contexts/clients/client-resources/adapters/inbound/http/client/own-resources-controller.server";
import { CoachResourcesController } from "~/bounded-contexts/clients/client-resources/adapters/inbound/http/coach/coach-resources-controller.server";
import { ClientResourcesController } from "~/bounded-contexts/clients/client-resources/adapters/inbound/http/resources/client-resources-controller.server";
import { PostgresClientResources } from "~/bounded-contexts/clients/client-resources/adapters/outbound/persistence/resources/client-resources-repository.server";
import { RandomClientResourceIds } from "~/bounded-contexts/clients/client-resources/adapters/outbound/persistence/resources/random-client-resource-ids.server";
import type { ClientResourcesFeature } from "~/bounded-contexts/clients/client-resources/adapters/inbound/http/context.server";

type ClientResourcesFeatureHandles = {
  clientReach: Pick<ClientReach, "findByAuthSubjectId" | "findById">;
  clock: Clock;
  database: DatabaseClient;
  documentPages: ResourceDocumentPages;
  fileFormats: ResourceFileFormatDetector;
  imagePages: ResourceImagePages;
  incidents: ClientResourceIncidents;
  store: ClientResourceStore;
};

export function composeClientResourcesFeature(
  handles: ClientResourcesFeatureHandles,
): ClientResourcesFeature {
  const accessPorts = {
    resources: new PostgresClientResources(handles.database),
    clients: handles.clientReach,
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
