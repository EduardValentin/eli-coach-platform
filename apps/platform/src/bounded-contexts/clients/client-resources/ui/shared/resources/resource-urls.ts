import { joinBasePath } from "~/shared/http/base-path";

import {
  resourceDownloadPath,
  resourcePagePath,
  resourceThumbnailPath,
} from "~/bounded-contexts/clients/client-resources/public/paths";

export function resourceThumbnailUrl(resourceId: string): string {
  return joinBasePath(
    import.meta.env.BASE_URL,
    resourceThumbnailPath(resourceId),
  );
}

export function resourcePageUrl(
  resourceId: string,
  pageNumber: number,
): string {
  return joinBasePath(
    import.meta.env.BASE_URL,
    resourcePagePath(resourceId, pageNumber),
  );
}

export function resourceDownloadUrl(resourceId: string): string {
  return joinBasePath(
    import.meta.env.BASE_URL,
    resourceDownloadPath(resourceId),
  );
}
