import { joinBasePath } from "~/shared/http/base-path";

import { progressPhotoPath } from "~/bounded-contexts/clients/client-profile/public/paths";

export function progressPhotoUrl(photoId: string): string {
  return joinBasePath(import.meta.env.BASE_URL, progressPhotoPath(photoId));
}
