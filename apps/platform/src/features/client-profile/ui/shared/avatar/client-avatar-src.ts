import { joinBasePath } from "@eli-coach-platform/config";

import type { ClientAvatarUrl } from "~/features/client-profile/public/client-avatar";

export function clientAvatarSrc(avatarUrl: ClientAvatarUrl): ClientAvatarUrl {
  return avatarUrl === null
    ? null
    : joinBasePath(import.meta.env.BASE_URL, avatarUrl);
}
