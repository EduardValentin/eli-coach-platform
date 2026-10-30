import type { ClientResourceStorePort } from "~/bounded-contexts/clients/client-resources/domain/client-resources";

import { FilesystemClientResourceStoreAdapter } from "./filesystem-client-resource-store-adapter.server";
import { isReadyMediaRoot } from "~/shared/private-files/filesystem/media-root.server";

export function createClientResourceStoreAdapter(
  root: string,
): ClientResourceStorePort {
  if (!isReadyMediaRoot(root)) {
    throw new Error("Client resource root is not ready.");
  }

  return new FilesystemClientResourceStoreAdapter(root);
}
