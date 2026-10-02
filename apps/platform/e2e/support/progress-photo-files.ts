import { rmSync } from "node:fs";
import { resolve } from "node:path";

import { platformDirectory } from "./repo-paths";

export function removeProgressPhotoFilesOf(
  clientIds: readonly string[],
): string {
  const mediaRoot = process.env.CLIENT_MEDIA_ROOT;

  if (!mediaRoot) return "skipped, CLIENT_MEDIA_ROOT is not set";

  try {
    for (const clientId of clientIds) {
      rmSync(resolve(platformDirectory, mediaRoot, clientId), {
        force: true,
        recursive: true,
      });
    }

    return `removed for ${clientIds.length} clients`;
  } catch (error) {
    return `failed: ${error instanceof Error ? error.message : String(error)}`;
  }
}
