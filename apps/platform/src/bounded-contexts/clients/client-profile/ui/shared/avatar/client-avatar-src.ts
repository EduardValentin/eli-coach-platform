import { appUrl } from "~/shared/http/base-path";

import type { ClientAvatarUrl } from "~/bounded-contexts/clients/client-profile/public/client-avatar";

export function clientAvatarSrc(
  avatarUrl: ClientAvatarUrl,
): string | undefined {
  return avatarUrl === null ? undefined : appUrl(avatarUrl);
}
