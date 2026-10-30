import type { ClientFilesConfig } from "~/bounded-contexts/clients/client-profile/config.server";
import type { ClientAvatarStorePort } from "~/bounded-contexts/clients/client-profile/domain/client-profile";

import { clientAvatarStorageKey } from "./client-media-layout.server";
import { createClientMediaStore } from "./client-media-stores.server";

export function createClientAvatarStoreAdapter(
  config: ClientFilesConfig,
): ClientAvatarStorePort {
  return createClientMediaStore(config, clientAvatarStorageKey);
}
