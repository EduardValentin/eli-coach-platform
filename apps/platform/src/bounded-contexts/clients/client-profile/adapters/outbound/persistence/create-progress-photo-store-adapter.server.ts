import type { ClientFilesConfig } from "~/bounded-contexts/clients/client-profile/config.server";
import type { ProgressPhotoStorePort } from "~/bounded-contexts/clients/client-profile/domain/client-profile";

import { progressPhotoStorageKey } from "./client-media-layout.server";
import { createClientMediaStore } from "./client-media-stores.server";

export function createProgressPhotoStoreAdapter(
  config: ClientFilesConfig,
): ProgressPhotoStorePort {
  return createClientMediaStore(config, progressPhotoStorageKey);
}
