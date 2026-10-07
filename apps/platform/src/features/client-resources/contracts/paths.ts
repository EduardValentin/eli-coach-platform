import { CLIENT_PORTAL_PATH } from "../../accounts/contracts/paths";
import {
  COACH_CLIENTS_ROUTE_SEGMENT,
  coachClientPath,
} from "../../coaching-sales/contracts/paths";

const CLIENT_RESOURCES_API = "/api/client-resources";

const RESOURCES_SEGMENT = "resources";

export const CLIENT_RESOURCES_API_PATHS = {
  clientResources: `${CLIENT_RESOURCES_API}/clients/:clientId/${RESOURCES_SEGMENT}`,
  resource: `${CLIENT_RESOURCES_API}/:resourceId`,
  resourcePage: `${CLIENT_RESOURCES_API}/:resourceId/pages/:pageNumber`,
  resourceThumbnail: `${CLIENT_RESOURCES_API}/:resourceId/thumbnail`,
  resourceDownload: `${CLIENT_RESOURCES_API}/:resourceId/download`,
  resourceOpened: `${CLIENT_RESOURCES_API}/:resourceId/opened`,
} as const;

export const CLIENT_RESOURCES_ROUTE_SEGMENT = RESOURCES_SEGMENT;

export const CLIENT_RESOURCES_PATH = `${CLIENT_PORTAL_PATH}/${CLIENT_RESOURCES_ROUTE_SEGMENT}`;

export const COACH_CLIENT_RESOURCES_ROUTE_SEGMENT = `${COACH_CLIENTS_ROUTE_SEGMENT}/:clientId/${RESOURCES_SEGMENT}`;

export function coachClientResourcesPath(clientId: string): string {
  return `${coachClientPath(clientId)}/${RESOURCES_SEGMENT}`;
}

export function clientResourcesPath(clientId: string): string {
  return `${CLIENT_RESOURCES_API}/clients/${encodeURIComponent(clientId)}/${RESOURCES_SEGMENT}`;
}

export function resourcePath(resourceId: string): string {
  return `${CLIENT_RESOURCES_API}/${encodeURIComponent(resourceId)}`;
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

export function resourceOpenedPath(resourceId: string): string {
  return `${resourcePath(resourceId)}/opened`;
}
