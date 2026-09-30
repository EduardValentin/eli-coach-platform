import { joinBasePath } from "@eli-coach-platform/config";

import { progressPhotoPath } from "~/features/client-profile/contracts/paths";

export function progressPhotoUrl(photoId: string): string {
  return joinBasePath(import.meta.env.BASE_URL, progressPhotoPath(photoId));
}
