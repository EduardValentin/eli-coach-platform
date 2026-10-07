import { existsSync, readdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

import { platformDirectory } from "./repo-paths";

function clientResourceRoot(): string | undefined {
  const resourceRoot = process.env.CLIENT_RESOURCE_ROOT;

  return resourceRoot && resolve(platformDirectory, resourceRoot);
}

export function storedResourceIdsOf(clientId: string): string[] {
  const resourceRoot = clientResourceRoot();

  if (!resourceRoot) {
    throw new Error("CLIENT_RESOURCE_ROOT is not set for the e2e run.");
  }

  const clientDirectory = resolve(resourceRoot, clientId);

  if (!existsSync(clientDirectory)) return [];

  return readdirSync(clientDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

export function removeClientResourceFilesOf(
  clientIds: readonly string[],
): string {
  const resourceRoot = clientResourceRoot();

  if (!resourceRoot) return "skipped, CLIENT_RESOURCE_ROOT is not set";

  try {
    for (const clientId of clientIds) {
      rmSync(resolve(resourceRoot, clientId), {
        force: true,
        recursive: true,
      });
    }

    return `removed for ${clientIds.length} clients`;
  } catch (error) {
    return `failed: ${error instanceof Error ? error.message : String(error)}`;
  }
}
