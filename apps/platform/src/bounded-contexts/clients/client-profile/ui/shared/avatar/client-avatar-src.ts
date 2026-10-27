import { joinBasePath } from "@eli-coach-platform/config";

import type { ClientAvatarUrl } from "~/bounded-contexts/clients/client-profile/public/client-avatar";

export function clientAvatarSrc(
  avatarUrl: ClientAvatarUrl,
): string | undefined {
  return avatarUrl === null
    ? undefined
    : joinBasePath(import.meta.env.BASE_URL, avatarUrl);
}
