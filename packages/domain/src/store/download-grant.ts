import type { DownloadGrant, ProductAsset } from "./models";

export function isDownloadGrantActive(
  grant: DownloadGrant,
  now: Date,
): boolean {
  return grant.status === "active" && grant.expiresAt.getTime() > now.getTime();
}

export type GrantDelivery =
  | { kind: "single"; asset: ProductAsset }
  | { kind: "bundle"; assets: readonly ProductAsset[] }
  | { kind: "empty" };

export function resolveGrantDelivery(grant: DownloadGrant): GrantDelivery {
  if (
    grant.items.length === 0 ||
    grant.items.some((item) => item.assets.length === 0)
  ) {
    return { kind: "empty" };
  }

  const assets = grant.items.flatMap((item) => item.assets);

  if (assets.length === 1) {
    return { kind: "single", asset: assets[0]! };
  }

  return { kind: "bundle", assets };
}

export type DownloadGrantResolution =
  | { status: "available"; delivery: GrantDelivery; grant: DownloadGrant }
  | { status: "unavailable" };
