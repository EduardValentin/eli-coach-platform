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
};

type PublishedProductAssetRow = ProductAsset & {
  productVersionId: number;
};

type PublishedProductTaxonomyRow = StoreTaxonomyValue & {
  productVersionId: number;
};

type PublishedProductRelations = {
  assets: readonly ProductAsset[];
  types: readonly StoreTaxonomyValue[];
  goals: readonly StoreTaxonomyValue[];
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
    const productResult =
      await this.database.execute<PublishedProductRow>(sql`
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
          current_version.published_at as "publishedAt"
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

    if (productResult.rows.length === 0) {
      return [];
    }

    const productVersionIds = productResult.rows.map(
      (product) => product.versionId,
    );
    const productVersionParameters = sql.join(
      productVersionIds.map((productVersionId) => sql`${productVersionId}`),
      sql`, `,
    );
    const [assetResult, typeResult, goalResult] = await Promise.all([
      this.database.execute<PublishedProductAssetRow>(sql`
        select
          asset.product_version_id as "productVersionId",
          asset.asset_key as "assetKey",
          asset.customer_filename as "customerFilename",
          asset.mime_type as "mimeType",
          asset.size_bytes as "sizeBytes",
          asset.sha256
        from app.product_version_assets asset
        where asset.product_version_id in (${productVersionParameters})
        order by asset.product_version_id, asset.id
      `),
      this.database.execute<PublishedProductTaxonomyRow>(sql`
        select
          assignment.product_version_id as "productVersionId",
          product_type.slug,
          product_type.display_label as "label",
          product_type.display_order as "displayOrder"
        from app.product_version_type_assignments assignment
        join app.product_types product_type
          on product_type.id = assignment.product_type_id
        where assignment.product_version_id in (${productVersionParameters})
        order by assignment.product_version_id, product_type.display_order
      `),
      this.database.execute<PublishedProductTaxonomyRow>(sql`
        select
          assignment.product_version_id as "productVersionId",
          product_goal.slug,
          product_goal.display_label as "label",
          product_goal.display_order as "displayOrder"
        from app.product_version_goal_assignments assignment
        join app.product_goals product_goal
          on product_goal.id = assignment.product_goal_id
        where assignment.product_version_id in (${productVersionParameters})
        order by assignment.product_version_id, product_goal.display_order
      `),
    ]);
    const assetsByProductVersion = groupRowsByProductVersion(
      assetResult.rows,
      mapProductAsset,
    );
    const typesByProductVersion = groupRowsByProductVersion(
      typeResult.rows,
      mapTaxonomyValue,
    );
    const goalsByProductVersion = groupRowsByProductVersion(
      goalResult.rows,
      mapTaxonomyValue,
    );

    return productResult.rows.map((product) =>
      mapPublishedProduct(product, {
        assets: assetsByProductVersion.get(product.versionId) ?? [],
        goals: goalsByProductVersion.get(product.versionId) ?? [],
        types: typesByProductVersion.get(product.versionId) ?? [],
      }),
    );
  }
}

function mapPublishedProduct(
  row: PublishedProductRow,
  relations: PublishedProductRelations,
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
      assets: relations.assets,
      types: relations.types,
      goals: relations.goals,
      publishedAt: new Date(row.publishedAt),
    },
  };
}

function mapProductAsset(row: PublishedProductAssetRow): ProductAsset {
  return {
    assetKey: row.assetKey,
    customerFilename: row.customerFilename,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    sha256: row.sha256,
  };
}

function mapTaxonomyValue(
  row: PublishedProductTaxonomyRow,
): StoreTaxonomyValue {
  return {
    slug: row.slug,
    label: row.label,
    displayOrder: row.displayOrder,
  };
}

function groupRowsByProductVersion<
  Row extends { productVersionId: number },
  Value,
>(
  rows: readonly Row[],
  mapRow: (row: Row) => Value,
): Map<number, Value[]> {
  const groupedRows = new Map<number, Value[]>();

  for (const row of rows) {
    const values = groupedRows.get(row.productVersionId) ?? [];

    values.push(mapRow(row));
    groupedRows.set(row.productVersionId, values);
  }

  return groupedRows;
}
