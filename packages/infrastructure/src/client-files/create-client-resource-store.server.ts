import type { ClientResourceStore } from "@eli-coach-platform/domain/client-resources";

import { FilesystemClientResourceStore } from "./filesystem/filesystem-client-resource-store.server";
import { isReadyMediaRoot } from "./filesystem/media-root.server";

export function createClientResourceStore(root: string): ClientResourceStore {
  if (!isReadyMediaRoot(root)) {
    throw new Error("Client resource root is not ready.");
  }

  return new FilesystemClientResourceStore(root);
}
