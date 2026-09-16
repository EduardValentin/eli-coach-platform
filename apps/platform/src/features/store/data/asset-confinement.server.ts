import { isAbsolute, relative } from "node:path";

import type { ProductAsset } from "@eli-coach-platform/domain/store";

export type FileIdentity = { dev: number; ino: number };

export function isPathWithinRoot(root: string, candidate: string): boolean {
  const relativePath = relative(root, candidate);

  return (
    relativePath !== "" &&
    relativePath !== ".." &&
    !relativePath.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) &&
    !isAbsolute(relativePath)
  );
}

export function isConfinedAsset(input: {
  opened: FileIdentity;
  resolved: FileIdentity;
  resolvedAsset: string;
  resolvedRoot: string;
}): boolean {
  return (
    isPathWithinRoot(input.resolvedRoot, input.resolvedAsset) &&
    input.opened.dev === input.resolved.dev &&
    input.opened.ino === input.resolved.ino
  );
}

export function matchesAssetIdentity(
  stats: { isFile: boolean; size: number },
  asset: Pick<ProductAsset, "sizeBytes">,
): boolean {
  return stats.isFile && stats.size === asset.sizeBytes;
}

export function matchesAssetDigest(
  computedSha256Hex: string,
  asset: Pick<ProductAsset, "sha256">,
): boolean {
  return computedSha256Hex === asset.sha256;
}
