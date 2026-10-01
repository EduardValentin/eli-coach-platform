import { rmSync } from "node:fs";
import { resolve } from "node:path";

import { platformDirectory } from "./repo-paths";

export function removeProgressPhotoFilesOf(clientIds: readonly string[]): void {
  const mediaRoot = process.env.CLIENT_MEDIA_ROOT;

  if (!mediaRoot) return;

  for (const clientId of clientIds) {
    rmSync(resolve(platformDirectory, mediaRoot, clientId), {
      force: true,
      recursive: true,
    });
  }
}
