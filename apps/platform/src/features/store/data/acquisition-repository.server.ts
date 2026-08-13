import type {
  AcquisitionPreparation,
  PrepareAcquisitionCommand,
  ResolvedPriorAcquisition,
  StoreAcquisitionRepository,
  StoreDeliveryLimitWindow,
} from "@eli-coach-platform/domain";
import { sql } from "drizzle-orm";

import type { DatabaseClient } from "@eli-coach-platform/db";

type ExistingRequestRow = {
  deliveryStatus: "pending" | "accepted" | "rejected";
  expiresAt: Date | string;
  payloadDigest: string;
};

type LockedProductRow = {
  id: number;
  lifecycleStatus: "draft" | "published" | "archived";
  slug: string;
};

type LockedProductVersionRow = {
  id: number;
  productId: number;
  publishedAt: Date | string | null;
  sequence: number;
};

type IdRow = {
  id: number;
};

/** Postgres returns bigint aggregates as strings through node-postgres. */
type DeliveryUsageRow = {
  cooldownCount: string;
  dailyCount: string;
};

const MAX_SERIALIZATION_RETRIES = 3;
const SERIALIZATION_FAILURE_CODE = "40001";
const UNIQUE_VIOLATION_CODE = "23505";
const IDEMPOTENCY_KEY_CONSTRAINT =
  "acquisition_requests_idempotency_key_unique";
const TRANSIENT_DATABASE_ERROR_CODES = new Set([
  "08000",
  "08001",
  "08003",
  "08004",
  "08006",
  "53300",
  "57P01",
  "57P02",
  "57P03",
  "ECONNRESET",
  "EPIPE",
  "ETIMEDOUT",
]);

export class PostgresStoreAcquisitionRepository
  implements StoreAcquisitionRepository
{
  constructor(private readonly database: DatabaseClient) {}

  async resolveIdempotency(command: {
    idempotencyKey: string;
    payloadDigest: string;
  }): Promise<ResolvedPriorAcquisition | null> {
    const result = await this.database.execute<ExistingRequestRow>(sql`
      select
        request.payload_digest as "payloadDigest",
        request.delivery_status as "deliveryStatus",
        (
          select expires_at
          from app.download_grants
          where request_id = request.id
          order by id
          limit 1
        ) as "expiresAt"
      from app.acquisition_requests request
      where request.idempotency_key = ${command.idempotencyKey}
    `);
    const [existing] = result.rows;

    if (!existing) {
      return null;
    }

    return existing.payloadDigest === command.payloadDigest
      ? {
          status: "replay",
          deliveryStatus: existing.deliveryStatus,
          expiresAt: new Date(existing.expiresAt),
        }
      : { status: "idempotency_conflict" };
  }

  async prepareAcquisition(
    command: PrepareAcquisitionCommand,
  ): Promise<AcquisitionPreparation> {
    return this.runWithRetry(() =>
      this.prepareInSerializableTransaction(command),
    );
  }

  async recordDeliveryAccepted(command: {
    deliveryAttemptId: number;
    requestId: number;
    provider: string;
    providerMessageId: string;
  }): Promise<void> {
    await this.runWithRetry(() =>
      this.database.transaction(async (transaction) => {
        await transaction.execute(sql`
          update app.delivery_attempts
          set status = 'accepted',
            provider_message_id = ${command.providerMessageId},
            updated_at = now()
          where id = ${command.deliveryAttemptId}
            and request_id = ${command.requestId}
            and provider = ${command.provider}
            and status = 'pending'
        `);
        await transaction.execute(sql`
          update app.acquisition_requests
          set delivery_status = 'accepted',
            updated_at = now()
          where id = ${command.requestId}
            and delivery_status = 'pending'
        `);
      }),
    );
  }

  async recordDeliveryRejected(command: {
    deliveryAttemptId: number;
    requestId: number;
    provider: string;
  }): Promise<void> {
    await this.database.transaction(async (transaction) => {
      await transaction.execute(sql`
        update app.delivery_attempts
        set status = 'rejected',
          updated_at = now()
        where id = ${command.deliveryAttemptId}
          and request_id = ${command.requestId}
          and provider = ${command.provider}
          and status = 'pending'
      `);
      await transaction.execute(sql`
        update app.acquisition_requests
        set delivery_status = 'rejected',
          updated_at = now()
        where id = ${command.requestId}
          and delivery_status = 'pending'
      `);
      await transaction.execute(sql`
        update app.download_grants download_grant
        set status = 'revoked'
        where download_grant.request_id = ${command.requestId}
          and download_grant.status = 'active'
          and exists (
            select 1
            from app.acquisition_requests request
            where request.id = download_grant.request_id
              and request.delivery_status = 'rejected'
          )
      `);
    });
  }

  async recordDeliveryRetryable(command: {
    deliveryAttemptId: number;
    requestId: number;
  }): Promise<void> {
    await this.database.execute(sql`
      update app.delivery_attempts
      set status = 'retryable',
        updated_at = now()
      where id = ${command.deliveryAttemptId}
        and request_id = ${command.requestId}
        and status = 'pending'
    `);
  }

  private async prepareInSerializableTransaction(
    command: PrepareAcquisitionCommand,
  ): Promise<AcquisitionPreparation> {
    return this.database.transaction(
      async (transaction) => {
        const existingRequest =
          await transaction.execute<ExistingRequestRow>(sql`
            select
              request.payload_digest as "payloadDigest",
              request.delivery_status as "deliveryStatus",
              (
                select expires_at
                from app.download_grants
                where request_id = request.id
                order by id
                limit 1
              ) as "expiresAt"
            from app.acquisition_requests request
            where request.idempotency_key = ${command.idempotencyKey}
            for update
          `);
        const [existing] = existingRequest.rows;

        if (existing) {
          return existing.payloadDigest === command.payloadDigest
            ? {
                status: "replay",
                deliveryStatus: existing.deliveryStatus,
                expiresAt: new Date(existing.expiresAt),
              }
            : { status: "idempotency_conflict" };
        }

        const limitedWindow = await resolveLimitedWindow(
          transaction,
          command,
        );

        if (limitedWindow) {
          return { status: "rate_limited", window: limitedWindow };
        }

        const currentProducts = await lockCurrentProducts(
          transaction,
          command,
        );

        if (currentProducts.status === "unavailable_products") {
          return currentProducts;
        }

        const recipientResult = await transaction.execute<IdRow>(sql`
          insert into app.store_recipients (
            normalized_email,
            delivery_limit_key,
            updated_at
          )
          values (
            ${command.normalizedEmail},
            ${command.deliveryLimitKey},
            ${command.requestedAt}
          )
          on conflict (normalized_email)
          do update set updated_at = excluded.updated_at
          returning id
        `);
        const recipientId = getRequiredId(
          recipientResult.rows,
          "Store recipient upsert",
        );
        const requestResult = await transaction.execute<IdRow>(sql`
          insert into app.acquisition_requests (
            recipient_id,
            idempotency_key,
            payload_digest,
            terms_version,
            privacy_policy_version,
            marketing_consent_version,
            marketing_consent,
            marketing_consented_at,
            requested_product_slugs,
            delivery_status,
            created_at,
            updated_at
          )
          values (
            ${recipientId},
            ${command.idempotencyKey},
            ${command.payloadDigest},
            ${command.termsVersion},
            ${command.privacyPolicyVersion},
            ${command.marketingConsentVersion},
            ${command.marketingConsent},
            ${command.marketingConsentedAt},
            ${JSON.stringify(command.products.map((product) => product.slug))}::jsonb,
            'pending',
            ${command.requestedAt},
            ${command.requestedAt}
          )
          returning id
        `);
        const requestId = getRequiredId(
          requestResult.rows,
          "Acquisition request insert",
        );

        for (const product of command.products) {
          await transaction.execute(sql`
            insert into app.acquisitions (
              recipient_id,
              product_id,
              first_requested_at,
              last_requested_at,
              request_count
            )
            values (
              ${recipientId},
              ${product.id},
              ${command.requestedAt},
              ${command.requestedAt},
              1
            )
            on conflict (recipient_id, product_id)
            do update set
              last_requested_at = excluded.last_requested_at,
              request_count = app.acquisitions.request_count + 1
          `);
        }

        const grantResult = await transaction.execute<IdRow>(sql`
          insert into app.download_grants (
            request_id,
            token_sha256,
            status,
            expires_at,
            created_at
          )
          values (
            ${requestId},
            ${command.tokenSha256},
            'active',
            ${command.expiresAt},
            ${command.requestedAt}
          )
          returning id
        `);
        const grantId = getRequiredId(
          grantResult.rows,
          "Download grant insert",
        );

        for (const product of command.products) {
          await transaction.execute(sql`
            insert into app.download_grant_items (
              grant_id,
              product_version_id
            )
            values (
              ${grantId},
              ${product.version.id}
            )
          `);
        }

        const deliveryAttemptResult = await transaction.execute<IdRow>(sql`
          insert into app.delivery_attempts (
            request_id,
            provider,
            provider_idempotency_key,
            status,
            created_at,
            updated_at
          )
          values (
            ${requestId},
            ${command.deliveryProvider},
            ${command.providerIdempotencyKey},
            'pending',
            ${command.requestedAt},
            ${command.requestedAt}
          )
          returning id
        `);
        const deliveryAttemptId = getRequiredId(
          deliveryAttemptResult.rows,
          "Store delivery attempt insert",
        );

        return {
          deliveryAttemptId,
          deliveryProvider: command.deliveryProvider,
          providerIdempotencyKey: command.providerIdempotencyKey,
          status: "created",
          requestId,
        };
      },
      { isolationLevel: "serializable" },
    );
  }

  private async runWithRetry<Result>(
    operation: () => Promise<Result>,
  ): Promise<Result> {
    for (
      let attempt = 1;
      attempt <= MAX_SERIALIZATION_RETRIES;
      attempt += 1
    ) {
      try {
        return await operation();
      } catch (error) {
        if (
          !isRetryableAcquisitionError(error) ||
          attempt === MAX_SERIALIZATION_RETRIES
        ) {
          throw error;
        }
      }
    }

    throw new Error("Store acquisition retry loop exited unexpectedly.");
  }
}

/**
 * Counts the deliveries that hold a slot for this recipient. An attempt still
 * `pending` counts because its provider call may yet be accepted, which is what
 * closes the race between two simultaneous requests; recording a rejection or a
 * retryable outcome releases the slot again. An attempt whose own audit write
 * failed therefore stays `pending` and holds its slot until it ages out of the
 * rolling window.
 *
 * Both windows measure the attempt's own timestamp rather than its request's,
 * so a second attempt for one request would be windowed on when it was sent.
 * The cooldown window nests inside the rolling window, so one scan answers
 * both.
 *
 * Recipients are matched by their delivery limit key rather than their exact
 * address, so sub-addressed variants of one inbox share an allowance. The key
 * is stored and indexed because deriving it in this predicate would forfeit
 * the index, and a sequential scan here would widen the transaction's
 * predicate locks to the whole table.
 */
async function resolveLimitedWindow(
  transaction: Parameters<
    Parameters<DatabaseClient["transaction"]>[0]
  >[0],
  command: PrepareAcquisitionCommand,
): Promise<StoreDeliveryLimitWindow | null> {
  const usageResult = await transaction.execute<DeliveryUsageRow>(sql`
    select
      count(*) filter (
        where attempt.created_at > ${command.cooldownSince}
      ) as "cooldownCount",
      count(*) as "dailyCount"
    from app.store_recipients recipient
    join app.acquisition_requests request
      on request.recipient_id = recipient.id
    join app.delivery_attempts attempt
      on attempt.request_id = request.id
    where recipient.delivery_limit_key = ${command.deliveryLimitKey}
      and attempt.created_at > ${command.dailyWindowSince}
      and attempt.status in ('pending', 'accepted')
  `);
  const [usage] = usageResult.rows;

  if (!usage) {
    return null;
  }

  if (Number(usage.cooldownCount) > 0) {
    return "cooldown";
  }

  return Number(usage.dailyCount) >= command.dailyLimit ? "daily" : null;
}

async function lockCurrentProducts(
  transaction: Parameters<
    Parameters<DatabaseClient["transaction"]>[0]
  >[0],
  command: PrepareAcquisitionCommand,
): Promise<
  | { status: "available" }
  | {
      status: "unavailable_products";
      availableProductSlugs: readonly string[];
    }
> {
  const productSlugs = command.products.map((product) => product.slug);
  const lockedProductsResult = await transaction.execute<LockedProductRow>(sql`
    select
      id,
      lifecycle_status as "lifecycleStatus",
      slug
    from app.products
    where slug in (
      select jsonb_array_elements_text(${JSON.stringify(productSlugs)}::jsonb)
    )
    order by slug
    for update
  `);
  const lockedProducts = lockedProductsResult.rows;
  const lockedProductIds = lockedProducts.map((product) => product.id);
  const lockedVersionsResult =
    await transaction.execute<LockedProductVersionRow>(sql`
      select
        id,
        product_id as "productId",
        published_at as "publishedAt",
        sequence
      from app.product_versions
      where product_id in (
        select value::integer
        from jsonb_array_elements_text(
          ${JSON.stringify(lockedProductIds)}::jsonb
        )
      )
      order by product_id, sequence
      for update
    `);
  const currentVersionsByProductId = new Map<number, LockedProductVersionRow>();

  for (const version of lockedVersionsResult.rows) {
    if (version.publishedAt !== null) {
      currentVersionsByProductId.set(version.productId, version);
    }
  }

  const lockedProductsBySlug = new Map(
    lockedProducts.map((product) => [product.slug, product]),
  );
  const availableProductSlugs = productSlugs.filter((slug) => {
    const lockedProduct = lockedProductsBySlug.get(slug);

    return (
      lockedProduct?.lifecycleStatus === "published" &&
      currentVersionsByProductId.has(lockedProduct.id)
    );
  });
  const allExpectedVersionsAreCurrent = command.products.every((product) => {
    const lockedProduct = lockedProductsBySlug.get(product.slug);
    const currentVersion = lockedProduct
      ? currentVersionsByProductId.get(lockedProduct.id)
      : null;

    return (
      lockedProduct?.id === product.id &&
      lockedProduct.lifecycleStatus === "published" &&
      currentVersion?.id === product.version.id
    );
  });

  return allExpectedVersionsAreCurrent
    ? { status: "available" }
    : {
        status: "unavailable_products",
        availableProductSlugs,
      };
}

function getRequiredId(rows: readonly IdRow[], operation: string): number {
  const [row] = rows;

  if (!row) {
    throw new Error(`${operation} returned no identifier.`);
  }

  return row.id;
}

function isRetryableAcquisitionError(error: unknown): boolean {
  let currentError = error;

  while (typeof currentError === "object" && currentError !== null) {
    const code = getDatabaseErrorTextField(currentError, "code");

    if (
      code === SERIALIZATION_FAILURE_CODE ||
      (code !== null && TRANSIENT_DATABASE_ERROR_CODES.has(code))
    ) {
      return true;
    }

    if (
      code === UNIQUE_VIOLATION_CODE &&
      getDatabaseErrorTextField(currentError, "constraint") ===
        IDEMPOTENCY_KEY_CONSTRAINT
    ) {
      return true;
    }

    currentError =
      "cause" in currentError
        ? (currentError as { cause?: unknown }).cause
        : null;
  }

  return false;
}

function getDatabaseErrorTextField(
  error: unknown,
  field: "code" | "constraint",
): string | null {
  if (typeof error !== "object" || error === null || !(field in error)) {
    return null;
  }

  const value = (error as Record<typeof field, unknown>)[field];

  return typeof value === "string" ? value : null;
}
