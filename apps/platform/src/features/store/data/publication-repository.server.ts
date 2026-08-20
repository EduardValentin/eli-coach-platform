import type {
  PersistPublicationCommand,
  ProductPublication,
  PublishableProduct,
  StoreProductPublicationRepository,
  StoreTaxonomySnapshot,
  StoredPublicationRecord,
} from "@eli-coach-platform/domain";
import { sql } from "drizzle-orm";

import type { DatabaseClient } from "@eli-coach-platform/db";

type TaxonomyRow = {
  displayOrder: number;
  label: string;
  slug: string;
};

type PublishableProductRow = {
  displayOrder: number;
  id: number;
  latestVersionSequence: number | string;
  lifecycleStatus: "archived" | "draft" | "published";
  slug: string;
};

type StoredPublicationRow = {
  createdAt: Date | string;
  id: number;
  operation: "create_product" | "revise_product";
  payloadDigest: string;
  productId: number;
  productSlug: string;
  productVersionId: number;
};

type IdRow = { id: number };

type NextDisplayOrderRow = { nextDisplayOrder: number | string };

type DatabaseTransaction = Parameters<
  Parameters<DatabaseClient["transaction"]>[0]
>[0];

const MAX_SERIALIZATION_RETRIES = 3;
const SERIALIZATION_FAILURE_CODE = "40001";

export class PostgresStoreProductPublicationRepository
  implements StoreProductPublicationRepository
{
  constructor(private readonly database: DatabaseClient) {}

  async getTaxonomy(): Promise<StoreTaxonomySnapshot> {
    const [typeResult, goalResult] = await Promise.all([
      this.database.execute<TaxonomyRow>(sql`
        select slug, display_label as "label", display_order as "displayOrder"
        from app.product_types
        order by display_order
      `),
      this.database.execute<TaxonomyRow>(sql`
        select slug, display_label as "label", display_order as "displayOrder"
        from app.product_goals
        order by display_order
      `),
    ]);

    return { goals: goalResult.rows, types: typeResult.rows };
  }

  async findProductBySlug(slug: string): Promise<PublishableProduct | null> {
    return this.loadPublishableProduct(sql`product.slug = ${slug}`);
  }

  async findProductById(
    productId: number,
  ): Promise<PublishableProduct | null> {
    return this.loadPublishableProduct(sql`product.id = ${productId}`);
  }

  async findPublicationByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<StoredPublicationRecord | null> {
    const result = await this.database.execute<StoredPublicationRow>(sql`
      ${selectPublication(sql`publication.idempotency_key = ${idempotencyKey}`)}
    `);
    const [row] = result.rows;

    return row ? mapStoredPublication(row) : null;
  }

  /**
   * Read while planning, outside the publishing transaction, so two products
   * created at the same moment can be handed the same position. The catalog
   * breaks that tie on product id, so the result is a stable order rather than
   * a conflict — worth revisiting only if publishing ever stops being a
   * single-operator action.
   */
  async getNextDisplayOrder(): Promise<number> {
    const result = await this.database.execute<NextDisplayOrderRow>(sql`
      select coalesce(max(display_order), 0) + 1 as "nextDisplayOrder"
      from app.products
    `);

    return Number(result.rows[0]?.nextDisplayOrder ?? 1);
  }

  async retireProduct(productId: number): Promise<boolean> {
    const result = await this.database.execute<IdRow>(sql`
      update app.products
      set lifecycle_status = 'archived',
        updated_at = now()
      where id = ${productId}
      returning id
    `);

    return result.rows.length > 0;
  }

  async persistPublication(
    command: PersistPublicationCommand,
  ): Promise<ProductPublication> {
    return this.runWithRetry(() =>
      this.database.transaction(
        async (transaction) => this.persistInTransaction(transaction, command),
        { isolationLevel: "serializable" },
      ),
    );
  }

  private async persistInTransaction(
    transaction: DatabaseTransaction,
    command: PersistPublicationCommand,
  ): Promise<ProductPublication> {
    /**
     * Re-checked inside the transaction so two concurrent retries of the same
     * agent request settle on one publication rather than racing past the
     * service's earlier read and colliding on the unique index.
     */
    const replayed = await transaction.execute<StoredPublicationRow>(sql`
      ${selectPublication(
        sql`publication.idempotency_key = ${command.idempotencyKey}`,
      )}
    `);

    if (replayed.rows[0]) {
      return mapStoredPublication(replayed.rows[0]).publication;
    }

    const productId =
      command.productId ?? (await insertProduct(transaction, command));
    const versionId = await insertUnpublishedVersion(
      transaction,
      command,
      productId,
    );

    await insertVersionAssets(transaction, command, versionId);
    await insertTaxonomyAssignments(transaction, command, versionId);

    /**
     * Publication is the last step by database contract: a version may only be
     * flipped to published once it carries at least one downloadable asset, and
     * it becomes immutable the moment it is.
     */
    await transaction.execute(sql`
      update app.product_versions
      set published_at = now()
      where id = ${versionId}
    `);
    await transaction.execute(sql`
      update app.products
      set lifecycle_status = 'published',
        updated_at = now()
      where id = ${productId}
    `);

    const publicationResult = await transaction.execute<{
      createdAt: Date | string;
      id: number;
    }>(sql`
      insert into app.product_publications (
        product_id,
        product_version_id,
        operation,
        idempotency_key,
        payload_digest,
        published_by_kind,
        published_by_id
      )
      values (
        ${productId},
        ${versionId},
        ${command.operation},
        ${command.idempotencyKey},
        ${command.payloadDigest},
        ${command.publishedBy.kind},
        ${command.publishedBy.id}
      )
      returning id, created_at as "createdAt"
    `);
    const publicationRow = publicationResult.rows[0]!;

    return {
      id: publicationRow.id,
      operation: command.operation,
      productId,
      productSlug: command.productSlug,
      productVersionId: versionId,
      publishedAt: new Date(publicationRow.createdAt),
    };
  }

  private async loadPublishableProduct(
    predicate: ReturnType<typeof sql>,
  ): Promise<PublishableProduct | null> {
    const result = await this.database.execute<PublishableProductRow>(sql`
      select
        product.id,
        product.slug,
        product.lifecycle_status as "lifecycleStatus",
        product.display_order as "displayOrder",
        coalesce(
          (
            select max(product_version.sequence)
            from app.product_versions product_version
            where product_version.product_id = product.id
          ),
          0
        ) as "latestVersionSequence"
      from app.products product
      where ${predicate}
      limit 1
    `);
    const [row] = result.rows;

    return row
      ? {
          displayOrder: row.displayOrder,
          id: row.id,
          latestVersionSequence: Number(row.latestVersionSequence),
          lifecycleStatus: row.lifecycleStatus,
          slug: row.slug,
        }
      : null;
  }

  private async runWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    for (let attempt = 1; attempt < MAX_SERIALIZATION_RETRIES; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        if (!isSerializationFailure(error)) {
          throw error;
        }
      }
    }

    return operation();
  }
}

function selectPublication(
  predicate: ReturnType<typeof sql>,
): ReturnType<typeof sql> {
  return sql`
    select
      publication.id,
      publication.product_id as "productId",
      publication.product_version_id as "productVersionId",
      publication.operation,
      publication.payload_digest as "payloadDigest",
      publication.created_at as "createdAt",
      product.slug as "productSlug"
    from app.product_publications publication
    join app.products product on product.id = publication.product_id
    where ${predicate}
    limit 1
  `;
}

function mapStoredPublication(
  row: StoredPublicationRow,
): StoredPublicationRecord {
  return {
    payloadDigest: row.payloadDigest,
    publication: {
      id: row.id,
      operation: row.operation,
      productId: row.productId,
      productSlug: row.productSlug,
      productVersionId: row.productVersionId,
      publishedAt: new Date(row.createdAt),
    },
  };
}

async function insertProduct(
  transaction: DatabaseTransaction,
  command: PersistPublicationCommand,
): Promise<number> {
  const result = await transaction.execute<IdRow>(sql`
    insert into app.products (slug, lifecycle_status, display_order)
    values (${command.productSlug}, 'draft', ${command.displayOrder})
    returning id
  `);

  return result.rows[0]!.id;
}

async function insertUnpublishedVersion(
  transaction: DatabaseTransaction,
  command: PersistPublicationCommand,
  productId: number,
): Promise<number> {
  const result = await transaction.execute<IdRow>(sql`
    insert into app.product_versions (
      product_id,
      sequence,
      title,
      creator_name,
      card_summary,
      detail_description,
      included_items,
      cover_asset_key,
      cover_alt,
      cover_mime_type,
      cover_size_bytes,
      cover_sha256
    )
    values (
      ${productId},
      ${command.versionSequence},
      ${command.metadata.title},
      ${command.metadata.creatorName},
      ${command.metadata.cardSummary},
      ${command.metadata.detailDescription},
      ${JSON.stringify(command.metadata.includedItems)}::jsonb,
      ${command.cover.assetKey},
      ${command.cover.alt},
      ${command.cover.mimeType},
      ${command.cover.sizeBytes},
      ${command.cover.sha256}
    )
    returning id
  `);

  return result.rows[0]!.id;
}

async function insertVersionAssets(
  transaction: DatabaseTransaction,
  command: PersistPublicationCommand,
  versionId: number,
): Promise<void> {
  for (const asset of command.downloads) {
    await transaction.execute(sql`
      insert into app.product_version_assets (
        product_version_id,
        asset_key,
        customer_filename,
        mime_type,
        size_bytes,
        sha256
      )
      values (
        ${versionId},
        ${asset.assetKey},
        ${asset.customerFilename},
        ${asset.mimeType},
        ${asset.sizeBytes},
        ${asset.sha256}
      )
    `);
  }
}

async function insertTaxonomyAssignments(
  transaction: DatabaseTransaction,
  command: PersistPublicationCommand,
  versionId: number,
): Promise<void> {
  for (const slug of command.typeSlugs) {
    await transaction.execute(sql`
      insert into app.product_version_type_assignments (
        product_version_id,
        product_type_id
      )
      select ${versionId}, product_type.id
      from app.product_types product_type
      where product_type.slug = ${slug}
    `);
  }

  for (const slug of command.goalSlugs) {
    await transaction.execute(sql`
      insert into app.product_version_goal_assignments (
        product_version_id,
        product_goal_id
      )
      select ${versionId}, product_goal.id
      from app.product_goals product_goal
      where product_goal.slug = ${slug}
    `);
  }
}

function isSerializationFailure(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === SERIALIZATION_FAILURE_CODE
  );
}
