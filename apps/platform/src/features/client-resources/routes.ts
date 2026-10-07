import { relative, type RouteConfigEntry } from "@react-router/dev/routes";

import {
  CLIENT_RESOURCES_API_PATHS,
  CLIENT_RESOURCES_ROUTE_SEGMENT,
} from "./contracts/paths";

const { route } = relative(import.meta.dirname);

export const clientResourcesClientRoutes: RouteConfigEntry[] = [
  route(
    CLIENT_RESOURCES_ROUTE_SEGMENT,
    "./ui/client/resources/resources-page.tsx",
  ),
];

export const clientResourcesApiRoutes = [
  route(
    CLIENT_RESOURCES_API_PATHS.clientResources.slice(1),
    "./api/resources/client-resources.ts",
  ),
  route(
    CLIENT_RESOURCES_API_PATHS.resource.slice(1),
    "./api/resources/resource.ts",
  ),
  route(
    CLIENT_RESOURCES_API_PATHS.resourcePage.slice(1),
    "./api/resources/resource-page.ts",
  ),
  route(
    CLIENT_RESOURCES_API_PATHS.resourceThumbnail.slice(1),
    "./api/resources/resource-thumbnail.ts",
  ),
  route(
    CLIENT_RESOURCES_API_PATHS.resourceDownload.slice(1),
    "./api/resources/resource-download.ts",
  ),
  route(
    CLIENT_RESOURCES_API_PATHS.resourceOpened.slice(1),
    "./api/resources/resource-opened.ts",
  ),
];
