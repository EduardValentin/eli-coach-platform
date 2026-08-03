import type {
  ProductAsset,
  PublishedProductCover,
  PublishedStoreProduct,
  StoreCatalogRepository,
  StoreTaxonomyValue,
} from "@eli-coach-platform/domain";
import { sql } from "drizzle-orm";

import type { DatabaseClient } from "../database-client";

type PublishedProductRow = {
  productId: number;
  slug: string;
  displayOrder: number;
  versionId: number;
  versionSequence: number;
  title: string;
  creatorName: string;
  cardSummary: string;
  detailDescription: string;
  includedItems: string[];
  coverAssetKey: string;
  coverAlt: string;
  coverMimeType: string;
  coverSizeBytes: number;
  coverSha256: string;
  publishedAt: Date | string;
  assets: ProductAsset[];
  types: StoreTaxonomyValue[];
  goals: StoreTaxonomyValue[];
};

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
    return this.loadPublishedProducts(null);
  }

  async getPublishedProductBySlug(
    slug: string,
  ): Promise<PublishedStoreProduct | null> {
    const [product] = await this.loadPublishedProducts(slug);

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
      where product.lifecycle_status = 'published'
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

  private async loadPublishedProducts(
    slug: string | null,
  ): Promise<PublishedStoreProduct[]> {
    const result = await this.database.execute<PublishedProductRow>(sql`
      select
        product.id as "productId",
        product.slug,
        product.display_order as "displayOrder",
        current_version.id as "versionId",
        current_version.sequence as "versionSequence",
        current_version.title,
        current_version.creator_name as "creatorName",
        current_version.card_summary as "cardSummary",
        current_version.detail_description as "detailDescription",
        current_version.included_items as "includedItems",
        current_version.cover_asset_key as "coverAssetKey",
        current_version.cover_alt as "coverAlt",
        current_version.cover_mime_type as "coverMimeType",
        current_version.cover_size_bytes as "coverSizeBytes",
        current_version.cover_sha256 as "coverSha256",
        current_version.published_at as "publishedAt",
        coalesce(
          (
            select jsonb_agg(
              jsonb_build_object(
                'assetKey', asset.asset_key,
                'customerFilename', asset.customer_filename,
                'mimeType', asset.mime_type,
                'sizeBytes', asset.size_bytes,
                'sha256', asset.sha256
              )
              order by asset.id
            )
            from app.product_version_assets asset
            where asset.product_version_id = current_version.id
          ),
          '[]'::jsonb
        ) as assets,
        coalesce(
          (
            select jsonb_agg(
              jsonb_build_object(
                'slug', product_type.slug,
                'label', product_type.display_label,
                'displayOrder', product_type.display_order
              )
              order by product_type.display_order
            )
            from app.product_version_type_assignments assignment
            join app.product_types product_type
              on product_type.id = assignment.product_type_id
            where assignment.product_version_id = current_version.id
          ),
          '[]'::jsonb
        ) as types,
        coalesce(
          (
            select jsonb_agg(
              jsonb_build_object(
                'slug', product_goal.slug,
                'label', product_goal.display_label,
                'displayOrder', product_goal.display_order
              )
              order by product_goal.display_order
            )
            from app.product_version_goal_assignments assignment
            join app.product_goals product_goal
              on product_goal.id = assignment.product_goal_id
            where assignment.product_version_id = current_version.id
          ),
          '[]'::jsonb
        ) as goals
      from app.products product
      join lateral (
        select product_version.*
        from app.product_versions product_version
        where product_version.product_id = product.id
          and product_version.published_at is not null
        order by product_version.sequence desc
        limit 1
      ) current_version on true
      where product.lifecycle_status = 'published'
        and (${slug}::text is null or product.slug = ${slug})
      order by product.display_order, product.id
    `);

    return result.rows.map(mapPublishedProduct);
  }
}

function mapPublishedProduct(
  row: PublishedProductRow,
): PublishedStoreProduct {
  return {
    id: row.productId,
    slug: row.slug,
    displayOrder: row.displayOrder,
    version: {
      id: row.versionId,
      sequence: row.versionSequence,
      title: row.title,
      creatorName: row.creatorName,
      cardSummary: row.cardSummary,
      detailDescription: row.detailDescription,
      includedItems: row.includedItems,
      cover: {
        assetKey: row.coverAssetKey,
        alt: row.coverAlt,
        mimeType: row.coverMimeType,
        sizeBytes: row.coverSizeBytes,
        sha256: row.coverSha256,
      },
      assets: row.assets,
      types: row.types,
      goals: row.goals,
      publishedAt: new Date(row.publishedAt),
    },
  };
}
