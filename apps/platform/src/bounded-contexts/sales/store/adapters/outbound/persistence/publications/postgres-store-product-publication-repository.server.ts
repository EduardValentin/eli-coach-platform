import {
  Product,
  ProductPricing,
  type PersistPriceChangeCommand,
  type PersistPublicationCommand,
  type PriceChangePersistence,
  type ProductPricingSnapshot,
  type ProductPublication,
  type PublicationOperation,
  type PublishingPrincipal,
  type StoreProductPublicationsPort,
  type StoreTaxonomySnapshot,
  type StoredPublicationRecord,
} from "~/bounded-contexts/sales/store/domain/product";
import { sql } from "drizzle-orm";

import type { DatabaseClient, DatabaseExecutor } from "~/shared/database";
import { executorOf } from "~/shared/database/index.server";

type TaxonomyRow = {
  displayOrder: number;
  label: string;
  slug: string;
};

type ProductRow = {
  displayOrder: number;
  eurCents: number | null;
  id: number;
  latestVersionSequence: number | string;
  lifecycleStatus: "archived" | "draft" | "published";
  slug: string;
  usdCents: number | null;
};

type StoredPublicationRow = {
  createdAt: Date | string;
  id: number;
  operation: PublicationOperation;
  payloadDigest: string;
  productId: number;
  productSlug: string;
  productVersionId: number | null;
};

type PublicationRecordInput = {
  idempotencyKey: string;
  operation: PublicationOperation;
  payloadDigest: string;
  productId: number;
  productVersionId: number | null;
  publishedBy: PublishingPrincipal;
};

type InsertedPublicationRow = { createdAt: Date | string; id: number };

type IdRow = { id: number };

type NextDisplayOrderRow = { nextDisplayOrder: number | string };

const MAX_SERIALIZATION_RETRIES = 3;
const SERIALIZATION_FAILURE_CODE = "40001";

export class PostgresStoreProductPublicationRepository implements StoreProductPublicationsPort {
  constructor(private readonly database: DatabaseClient) {}

  private get executor() {
    return executorOf(this.database);
  }

  async getTaxonomy(): Promise<StoreTaxonomySnapshot> {
    const [typeResult, goalResult] = await Promise.all([
      this.executor.execute<TaxonomyRow>(sql`
        select slug, display_label as "label", display_order as "displayOrder"
        from app.product_types
        order by display_order
      `),
      this.executor.execute<TaxonomyRow>(sql`
        select slug, display_label as "label", display_order as "displayOrder"
        from app.product_goals
        order by display_order
      `),
    ]);

    return { goals: goalResult.rows, types: typeResult.rows };
  }

  async findProductBySlug(slug: string): Promise<Product | null> {
    return this.loadProduct(sql`product.slug = ${slug}`);
  }

  async findProductById(productId: number): Promise<Product | null> {
    return this.loadProduct(sql`product.id = ${productId}`);
  }

  async findPublicationByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<StoredPublicationRecord | null> {
    const result = await this.executor.execute<StoredPublicationRow>(sql`
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
    const result = await this.executor.execute<NextDisplayOrderRow>(sql`
      select coalesce(max(display_order), 0) + 1 as "nextDisplayOrder"
      from app.products
    `);

    return Number(result.rows[0]?.nextDisplayOrder ?? 1);
  }

  async retireProduct(productId: number): Promise<boolean> {
    const result = await this.executor.execute<IdRow>(sql`
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
      this.executor.transaction(
        async (transaction) => this.persistInTransaction(transaction, command),
        { isolationLevel: "serializable" },
      ),
    );
  }

  async persistPriceChange(
    command: PersistPriceChangeCommand,
  ): Promise<PriceChangePersistence> {
    return this.runWithRetry(() =>
      this.executor.transaction(
        async (transaction) =>
          this.persistPriceChangeInTransaction(transaction, command),
        { isolationLevel: "serializable" },
      ),
    );
  }

  private async persistPriceChangeInTransaction(
    transaction: DatabaseExecutor,
    command: PersistPriceChangeCommand,
  ): Promise<PriceChangePersistence> {
    await transaction.execute(sql`
      select id
      from app.products
      where id = ${command.productId}
      for update
    `);

    const replayed = await transaction.execute<StoredPublicationRow>(sql`
      ${selectPublication(
        sql`publication.idempotency_key = ${command.idempotencyKey}`,
      )}
    `);

    const [existing] = replayed.rows;

    if (existing) {
      return existing.payloadDigest === command.payloadDigest
        ? {
            status: "replayed",
            publication: mapStoredPublication(existing).publication,
          }
        : { status: "idempotency_conflict" };
    }

    const publicationRow = await this.insertPublication(transaction, {
      idempotencyKey: command.idempotencyKey,
      operation: "reprice_product",
      payloadDigest: command.payloadDigest,
      productId: command.productId,
      productVersionId: null,
      publishedBy: command.publishedBy,
    });

    await this.insertPriceRevision(transaction, {
      pricing: command.pricing,
      productId: command.productId,
      publicationId: publicationRow.id,
    });

    return {
      status: "recorded",
      publication: {
        id: publicationRow.id,
        operation: "reprice_product",
        productId: command.productId,
        productSlug: command.productSlug,
        productVersionId: null,
        publishedAt: new Date(publicationRow.createdAt),
      },
    };
  }

  private async persistInTransaction(
    transaction: DatabaseExecutor,
    command: PersistPublicationCommand,
  ): Promise<ProductPublication> {
    /**
     * Re-checked inside the transaction so two concurrent retries of the same
     * agent request settle on one publication rather than racing past the
     * use case's earlier read and colliding on the unique index.
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

    const publicationRow = await this.insertPublication(transaction, {
      idempotencyKey: command.idempotencyKey,
      operation: command.operation,
      payloadDigest: command.payloadDigest,
      productId,
      productVersionId: versionId,
      publishedBy: command.publishedBy,
    });

    if (command.pricing?.kind === "paid") {
      await this.insertPriceRevision(transaction, {
        pricing: command.pricing,
        productId,
        publicationId: publicationRow.id,
      });
    }

    return {
      id: publicationRow.id,
      operation: command.operation,
      productId,
      productSlug: command.productSlug,
      productVersionId: versionId,
      publishedAt: new Date(publicationRow.createdAt),
    };
  }

  private async insertPublication(
    transaction: DatabaseExecutor,
    input: PublicationRecordInput,
  ): Promise<InsertedPublicationRow> {
    const result = await transaction.execute<InsertedPublicationRow>(sql`
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
        ${input.productId},
        ${input.productVersionId},
        ${input.operation},
        ${input.idempotencyKey},
        ${input.payloadDigest},
        ${input.publishedBy.kind},
        ${input.publishedBy.id}
      )
      returning id, created_at as "createdAt"
    `);

    return result.rows[0]!;
  }

  private async insertPriceRevision(
    transaction: DatabaseExecutor,
    input: {
      pricing: ProductPricingSnapshot;
      productId: number;
      publicationId: number;
    },
  ): Promise<void> {
    const amounts = this.storedAmounts(input.pricing);

    await transaction.execute(sql`
      insert into app.product_price_revisions (
        product_id,
        sequence,
        eur_cents,
        usd_cents,
        publication_id
      )
      select
        ${input.productId},
        coalesce(max(price_revision.sequence), 0) + 1,
        ${amounts.eurCents}::integer,
        ${amounts.usdCents}::integer,
        ${input.publicationId}
      from app.product_price_revisions price_revision
      where price_revision.product_id = ${input.productId}
    `);
  }

  private storedAmounts(pricing: ProductPricingSnapshot): {
    eurCents: number | null;
    usdCents: number | null;
  } {
    return pricing.kind === "paid"
      ? { eurCents: pricing.eurCents, usdCents: pricing.usdCents }
      : { eurCents: null, usdCents: null };
  }

  private async loadProduct(
    predicate: ReturnType<typeof sql>,
  ): Promise<Product | null> {
    const result = await this.executor.execute<ProductRow>(sql`
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
        ) as "latestVersionSequence",
        current_price.eur_cents as "eurCents",
        current_price.usd_cents as "usdCents"
      from app.products product
      left join lateral (
        select price_revision.eur_cents, price_revision.usd_cents
        from app.product_price_revisions price_revision
        where price_revision.product_id = product.id
        order by price_revision.sequence desc
        limit 1
      ) current_price on true
      where ${predicate}
      limit 1
    `);
    const [row] = result.rows;

    return row
      ? Product.reconstitute({
          currentPricing: ProductPricing.fromStoredAmounts(row),
          displayOrder: row.displayOrder,
          id: row.id,
          latestVersionSequence: Number(row.latestVersionSequence),
          lifecycleStatus: row.lifecycleStatus,
          slug: row.slug,
        })
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
  transaction: DatabaseExecutor,
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
  transaction: DatabaseExecutor,
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
  transaction: DatabaseExecutor,
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
  transaction: DatabaseExecutor,
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
