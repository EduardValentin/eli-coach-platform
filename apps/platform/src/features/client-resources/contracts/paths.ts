import {
  COACH_CLIENTS_ROUTE_SEGMENT,
  coachClientPath,
} from "../../coaching-sales/contracts/paths";

const CLIENT_RESOURCES_API = "/api/client-resources";

const RESOURCES_SEGMENT = "resources";

export const CLIENT_RESOURCES_API_PATHS = {
  clientResources: `${CLIENT_RESOURCES_API}/clients/:clientId/${RESOURCES_SEGMENT}`,
  resourcePage: `${CLIENT_RESOURCES_API}/:resourceId/pages/:pageNumber`,
  resourceThumbnail: `${CLIENT_RESOURCES_API}/:resourceId/thumbnail`,
  resourceDownload: `${CLIENT_RESOURCES_API}/:resourceId/download`,
} as const;

export const COACH_CLIENT_RESOURCES_ROUTE_SEGMENT = `${COACH_CLIENTS_ROUTE_SEGMENT}/:clientId/${RESOURCES_SEGMENT}`;

export function coachClientResourcesPath(clientId: string): string {
  return `${coachClientPath(clientId)}/${RESOURCES_SEGMENT}`;
}

export function clientResourcesPath(clientId: string): string {
  return `${CLIENT_RESOURCES_API}/clients/${encodeURIComponent(clientId)}/${RESOURCES_SEGMENT}`;
}

export function resourcePagePath(
  resourceId: string,
  pageNumber: number,
): string {
  return `${resourcePath(resourceId)}/pages/${pageNumber}`;
}

export function resourceThumbnailPath(resourceId: string): string {
  return `${resourcePath(resourceId)}/thumbnail`;
}

export function resourceDownloadPath(resourceId: string): string {
  return `${resourcePath(resourceId)}/download`;
}

function resourcePath(resourceId: string): string {
  return `${CLIENT_RESOURCES_API}/${encodeURIComponent(resourceId)}`;
}
