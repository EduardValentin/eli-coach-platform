import type {
  DownloadGrant,
  DownloadGrantItem,
  DownloadGrantRepository,
  ProductAsset,
} from "@eli-coach-platform/domain";
import { sql } from "drizzle-orm";

import type { DatabaseClient } from "../database-client";

type DownloadGrantRow = {
  grantId: number;
  grantStatus: "active" | "revoked";
  expiresAt: Date | string;
  productSlug: string;
  productTitle: string;
  productVersionId: number;
  assetKey: string | null;
  customerFilename: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  sha256: string | null;
};

export class PostgresDownloadGrantRepository
  implements DownloadGrantRepository
{
  constructor(private readonly database: DatabaseClient) {}

  async findByTokenSha256(
    tokenSha256: string,
  ): Promise<DownloadGrant | null> {
    const result = await this.database.execute<DownloadGrantRow>(sql`
      select
        download_grant.id as "grantId",
        download_grant.status as "grantStatus",
        download_grant.expires_at as "expiresAt",
        product.slug as "productSlug",
        product_version.title as "productTitle",
        product_version.id as "productVersionId",
        asset.asset_key as "assetKey",
        asset.customer_filename as "customerFilename",
        asset.mime_type as "mimeType",
        asset.size_bytes as "sizeBytes",
        asset.sha256
      from app.download_grants download_grant
      join app.download_grant_items grant_item
        on grant_item.grant_id = download_grant.id
      join app.product_versions product_version
        on product_version.id = grant_item.product_version_id
      join app.products product
        on product.id = product_version.product_id
      left join app.product_version_assets asset
        on asset.product_version_id = product_version.id
      where download_grant.token_sha256 = ${tokenSha256}
      order by grant_item.product_version_id, asset.id
    `);
    const [firstRow] = result.rows;

    if (!firstRow) {
      return null;
    }

    return {
      id: firstRow.grantId,
      status: firstRow.grantStatus,
      expiresAt: new Date(firstRow.expiresAt),
      items: groupGrantItems(result.rows),
    };
  }

  async revoke(grantId: number): Promise<void> {
    await this.database.execute(sql`
      update app.download_grants
      set status = 'revoked'
      where id = ${grantId}
    `);
  }
}

function groupGrantItems(
  rows: readonly DownloadGrantRow[],
): DownloadGrantItem[] {
  const items = new Map<
    number,
    Omit<DownloadGrantItem, "assets"> & { assets: ProductAsset[] }
  >();

  for (const row of rows) {
    const existing = items.get(row.productVersionId);
    const asset = resolveAsset(row);

    if (existing) {
      if (asset) {
        existing.assets.push(asset);
      }
      continue;
    }

    items.set(row.productVersionId, {
      productSlug: row.productSlug,
      productTitle: row.productTitle,
      productVersionId: row.productVersionId,
      assets: asset ? [asset] : [],
    });
  }

  return [...items.values()];
}

function resolveAsset(row: DownloadGrantRow): ProductAsset | null {
  if (
    row.assetKey === null ||
    row.customerFilename === null ||
    row.mimeType === null ||
    row.sizeBytes === null ||
    row.sha256 === null
  ) {
    return null;
  }

  return {
    assetKey: row.assetKey,
    customerFilename: row.customerFilename,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    sha256: row.sha256,
  };
}
