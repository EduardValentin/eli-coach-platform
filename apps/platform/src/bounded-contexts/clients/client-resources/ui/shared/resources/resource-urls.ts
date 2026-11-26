import { appUrl } from "~/shared/http/base-path";

import {
  resourceDownloadPath,
  resourcePagePath,
  resourceThumbnailPath,
} from "~/bounded-contexts/clients/client-resources/public/paths";

export function resourceThumbnailUrl(resourceId: string): string {
  return appUrl(resourceThumbnailPath(resourceId));
}

export function resourcePageUrl(
  resourceId: string,
  pageNumber: number,
): string {
  return appUrl(resourcePagePath(resourceId, pageNumber));
}

export function resourceDownloadUrl(resourceId: string): string {
  return appUrl(resourceDownloadPath(resourceId));
}
