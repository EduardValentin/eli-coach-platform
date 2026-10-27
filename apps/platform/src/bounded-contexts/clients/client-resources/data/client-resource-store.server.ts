import type { ClientResourceStore } from "@eli-coach-platform/domain/client-resources";

import { FilesystemClientResourceStore } from "./filesystem-client-resource-store.server";
import { isReadyMediaRoot } from "~/shared/private-files/filesystem/media-root.server";

export function createClientResourceStore(root: string): ClientResourceStore {
  if (!isReadyMediaRoot(root)) {
    throw new Error("Client resource root is not ready.");
  }

  return new FilesystemClientResourceStore(root);
}
