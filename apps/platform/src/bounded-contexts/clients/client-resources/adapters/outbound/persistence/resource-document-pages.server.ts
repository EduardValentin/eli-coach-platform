import type { ResourceRenditions } from "~/bounded-contexts/clients/client-resources/domain/client-resources";

export type ResourceDocumentPagesOptions = {
  workerUrl: URL;
  renditions: ResourceRenditions;
};
