import {
  CATALOG_PRODUCT_LIFECYCLES,
  OWNED_PRODUCT_LIFECYCLES,
  type PublishedProductCover,
  type PublishedStoreProduct,
  type StoreCatalogRepository,
} from "@eli-coach-platform/domain";
import { sql, type SQL } from "drizzle-orm";

import type { DatabaseClient } from "@eli-coach-platform/db";

import { productAliasLifecycleWithin } from "./product-lifecycle-predicate.server";
import { loadPublishedProducts } from "./published-product-query.server";

type PublishedCoverRow = {
  assetKey: string;
  alt: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
};

export class PostgresStoreCatalogRepository
  implements StoreCatalogRepository
{
  constructor(private readonly database: DatabaseClient) {}

  async getPublishedCatalog(): Promise<readonly PublishedStoreProduct[]> {
    return loadPublishedProducts(this.database, productsInCatalog());
  }

  async getPublishedProductBySlug(
    slug: string,
  ): Promise<PublishedStoreProduct | null> {
    const [product] = await loadPublishedProducts(
      this.database,
      productInCatalogWithSlug(slug),
    );

    return product ?? null;
  }

  async getPublishedCoverByAssetKey(
    assetKey: string,
  ): Promise<PublishedProductCover | null> {
    const result = await this.database.execute<PublishedCoverRow>(sql`
      select
        published_version.cover_asset_key as "assetKey",
        published_version.cover_alt as "alt",
        published_version.cover_mime_type as "mimeType",
        published_version.cover_size_bytes as "sizeBytes",
        published_version.cover_sha256 as "sha256"
      from app.products product
      join app.product_versions published_version
        on published_version.product_id = product.id
      where ${productAliasLifecycleWithin(OWNED_PRODUCT_LIFECYCLES)}
        and published_version.published_at is not null
        and published_version.cover_asset_key = ${assetKey}
      order by published_version.sequence desc
      limit 1
    `);
    const [cover] = result.rows;

    return cover
      ? {
          ...cover,
          customerFilename: cover.assetKey.split("/").at(-1)!,
        }
      : null;
  }
}

function productsInCatalog(): SQL {
  return productAliasLifecycleWithin(CATALOG_PRODUCT_LIFECYCLES);
}

function productInCatalogWithSlug(slug: string): SQL {
  return sql`${productsInCatalog()} and product.slug = ${slug}`;
}
