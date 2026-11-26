import { appUrl } from "~/shared/http/base-path";

import { progressPhotoPath } from "~/bounded-contexts/clients/client-profile/public/paths";

export function progressPhotoUrl(photoId: string): string {
  return appUrl(progressPhotoPath(photoId));
}
