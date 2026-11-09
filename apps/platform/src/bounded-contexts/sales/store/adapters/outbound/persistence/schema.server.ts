import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { appSchema } from "~/shared/database";

export const productsTable = appSchema.table(
  "products",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 128 }).notNull(),
    lifecycleStatus: varchar("lifecycle_status", { length: 32 })
      .notNull()
      .default("draft"),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("products_slug_unique").on(table.slug),
    index("products_publication_order_idx").on(
      table.lifecycleStatus,
      table.displayOrder,
    ),
    check(
      "products_slug_format_check",
      sql`${table.slug} ~ '^[a-z0-9][a-z0-9-]*$'`,
    ),
    check(
      "products_lifecycle_status_check",
      sql`${table.lifecycleStatus} in ('draft', 'published', 'archived')`,
    ),
    check("products_display_order_check", sql`${table.displayOrder} >= 0`),
  ],
);

export const storeAssetIdentitiesTable = appSchema.table(
  "store_asset_identities",
  {
    assetKey: varchar("asset_key", { length: 512 }).primaryKey(),
    mimeType: varchar("mime_type", { length: 255 }).notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    sha256: varchar("sha256", { length: 64 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "store_asset_identities_relative_key_check",
      sql`length(btrim(${table.assetKey})) > 0 and ${table.assetKey} !~ '(^/|(^|/)\\.\\.(/|$))' and position(chr(92) in ${table.assetKey}) = 0 and ${table.assetKey} !~ '^[A-Za-z]:'`,
    ),
    check(
      "store_asset_identities_mime_type_check",
      sql`length(btrim(${table.mimeType})) > 0`,
    ),
    check("store_asset_identities_size_check", sql`${table.sizeBytes} >= 0`),
    check(
      "store_asset_identities_sha256_check",
      sql`${table.sha256} ~ '^[0-9a-f]{64}$'`,
    ),
  ],
);

export const productVersionsTable = appSchema.table(
  "product_versions",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => productsTable.id),
    sequence: integer("sequence").notNull(),
    title: varchar("title", { length: 240 }).notNull(),
    creatorName: varchar("creator_name", { length: 160 }).notNull(),
    cardSummary: varchar("card_summary", { length: 500 }).notNull(),
    detailDescription: text("detail_description").notNull(),
    includedItems: jsonb("included_items").$type<string[]>().notNull(),
    coverAssetKey: varchar("cover_asset_key", { length: 512 })
      .notNull()
      .references(() => storeAssetIdentitiesTable.assetKey),
    coverAlt: varchar("cover_alt", { length: 500 }).notNull(),
    coverMimeType: varchar("cover_mime_type", { length: 255 }).notNull(),
    coverSizeBytes: integer("cover_size_bytes").notNull(),
    coverSha256: varchar("cover_sha256", { length: 64 }).notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("product_versions_product_sequence_unique").on(
      table.productId,
      table.sequence,
    ),
    index("product_versions_publication_idx").on(
      table.productId,
      table.publishedAt,
      table.sequence,
    ),
    check("product_versions_sequence_check", sql`${table.sequence} > 0`),
    check(
      "product_versions_included_items_check",
      sql`jsonb_typeof(${table.includedItems}) = 'array'`,
    ),
    check(
      "product_versions_cover_relative_key_check",
      sql`length(btrim(${table.coverAssetKey})) > 0 and ${table.coverAssetKey} !~ '(^/|(^|/)\\.\\.(/|$))' and position(chr(92) in ${table.coverAssetKey}) = 0 and ${table.coverAssetKey} !~ '^[A-Za-z]:'`,
    ),
    check(
      "product_versions_cover_mime_type_check",
      sql`${table.coverMimeType} in ('image/avif', 'image/gif', 'image/jpeg', 'image/png', 'image/webp')`,
    ),
    check(
      "product_versions_cover_size_check",
      sql`${table.coverSizeBytes} >= 0`,
    ),
    check(
      "product_versions_cover_sha256_check",
      sql`${table.coverSha256} ~ '^[0-9a-f]{64}$'`,
    ),
  ],
);

export const productVersionAssetsTable = appSchema.table(
  "product_version_assets",
  {
    id: serial("id").primaryKey(),
    productVersionId: integer("product_version_id")
      .notNull()
      .references(() => productVersionsTable.id),
    assetKey: varchar("asset_key", { length: 512 })
      .notNull()
      .references(() => storeAssetIdentitiesTable.assetKey),
    customerFilename: varchar("customer_filename", {
      length: 255,
    }).notNull(),
    mimeType: varchar("mime_type", { length: 255 }).notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    sha256: varchar("sha256", { length: 64 }).notNull(),
  },
  (table) => [
    uniqueIndex("product_version_assets_key_unique").on(
      table.productVersionId,
      table.assetKey,
    ),
    uniqueIndex("product_version_assets_customer_filename_unique").on(
      table.productVersionId,
      table.customerFilename,
    ),
    check(
      "product_version_assets_relative_key_check",
      sql`length(btrim(${table.assetKey})) > 0 and ${table.assetKey} !~ '(^/|(^|/)\\.\\.(/|$))' and position(chr(92) in ${table.assetKey}) = 0 and ${table.assetKey} !~ '^[A-Za-z]:'`,
    ),
    check(
      "product_version_assets_customer_filename_check",
      sql`length(btrim(${table.customerFilename})) > 0 and ${table.customerFilename} not in ('.', '..') and position('/' in ${table.customerFilename}) = 0 and position(chr(92) in ${table.customerFilename}) = 0`,
    ),
    check("product_version_assets_size_check", sql`${table.sizeBytes} >= 0`),
    check(
      "product_version_assets_sha256_check",
      sql`${table.sha256} ~ '^[0-9a-f]{64}$'`,
    ),
  ],
);

export const productTypesTable = appSchema.table(
  "product_types",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 96 }).notNull(),
    displayLabel: varchar("display_label", { length: 96 }).notNull(),
    displayOrder: integer("display_order").notNull(),
  },
  (table) => [
    uniqueIndex("product_types_slug_unique").on(table.slug),
    uniqueIndex("product_types_display_order_unique").on(table.displayOrder),
    check(
      "product_types_slug_format_check",
      sql`${table.slug} ~ '^[a-z0-9][a-z0-9-]*$'`,
    ),
  ],
);

export const productGoalsTable = appSchema.table(
  "product_goals",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 96 }).notNull(),
    displayLabel: varchar("display_label", { length: 96 }).notNull(),
    displayOrder: integer("display_order").notNull(),
  },
  (table) => [
    uniqueIndex("product_goals_slug_unique").on(table.slug),
    uniqueIndex("product_goals_display_order_unique").on(table.displayOrder),
    check(
      "product_goals_slug_format_check",
      sql`${table.slug} ~ '^[a-z0-9][a-z0-9-]*$'`,
    ),
  ],
);

export const productVersionTypeAssignmentsTable = appSchema.table(
  "product_version_type_assignments",
  {
    productVersionId: integer("product_version_id")
      .notNull()
      .references(() => productVersionsTable.id),
    productTypeId: integer("product_type_id")
      .notNull()
      .references(() => productTypesTable.id),
  },
  (table) => [
    primaryKey({
      name: "product_version_type_assignments_pkey",
      columns: [table.productVersionId, table.productTypeId],
    }),
  ],
);

export const productVersionGoalAssignmentsTable = appSchema.table(
  "product_version_goal_assignments",
  {
    productVersionId: integer("product_version_id")
      .notNull()
      .references(() => productVersionsTable.id),
    productGoalId: integer("product_goal_id")
      .notNull()
      .references(() => productGoalsTable.id),
  },
  (table) => [
    primaryKey({
      name: "product_version_goal_assignments_pkey",
      columns: [table.productVersionId, table.productGoalId],
    }),
  ],
);

export const productPublicationsTable = appSchema.table(
  "product_publications",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => productsTable.id),
    productVersionId: integer("product_version_id").references(
      () => productVersionsTable.id,
    ),
    operation: varchar("operation", { length: 32 }).notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 128 }).notNull(),
    payloadDigest: varchar("payload_digest", { length: 64 }).notNull(),
    publishedByKind: varchar("published_by_kind", { length: 16 }).notNull(),
    publishedById: varchar("published_by_id", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("product_publications_idempotency_key_unique").on(
      table.idempotencyKey,
    ),
    uniqueIndex("product_publications_version_unique").on(
      table.productVersionId,
    ),
    index("product_publications_product_created_idx").on(
      table.productId,
      table.createdAt,
    ),
    check(
      "product_publications_operation_check",
      sql`${table.operation} in ('create_product', 'revise_product', 'reprice_product')`,
    ),
    check(
      "product_publications_version_check",
      sql`(${table.operation} in ('create_product', 'revise_product')) = (${table.productVersionId} is not null)`,
    ),
    check(
      "product_publications_payload_digest_check",
      sql`${table.payloadDigest} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "product_publications_published_by_kind_check",
      sql`${table.publishedByKind} in ('machine', 'user')`,
    ),
    check(
      "product_publications_published_by_id_check",
      sql`length(btrim(${table.publishedById})) > 0`,
    ),
  ],
);

export const productPriceRevisionsTable = appSchema.table(
  "product_price_revisions",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => productsTable.id),
    sequence: integer("sequence").notNull(),
    eurCents: integer("eur_cents"),
    usdCents: integer("usd_cents"),
    publicationId: integer("publication_id")
      .notNull()
      .references(() => productPublicationsTable.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("product_price_revisions_product_sequence_unique").on(
      table.productId,
      table.sequence,
    ),
    uniqueIndex("product_price_revisions_publication_unique").on(
      table.publicationId,
    ),
    check("product_price_revisions_sequence_check", sql`${table.sequence} > 0`),
    check(
      "product_price_revisions_amounts_check",
      sql`(${table.eurCents} is null and ${table.usdCents} is null) or (${table.eurCents} between 1 and 99999999 and ${table.usdCents} between 1 and 99999999)`,
    ),
  ],
);

export const storeRecipientsTable = appSchema.table(
  "store_recipients",
  {
    id: serial("id").primaryKey(),
    normalizedEmail: varchar("normalized_email", { length: 320 }).notNull(),
    deliveryLimitKey: varchar("delivery_limit_key", {
      length: 320,
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("store_recipients_normalized_email_unique").on(
      table.normalizedEmail,
    ),
    index("store_recipients_delivery_limit_key_idx").on(table.deliveryLimitKey),
  ],
);

export const acquisitionRequestsTable = appSchema.table(
  "acquisition_requests",
  {
    id: serial("id").primaryKey(),
    recipientId: integer("recipient_id")
      .notNull()
      .references(() => storeRecipientsTable.id),
    idempotencyKey: varchar("idempotency_key", { length: 128 }).notNull(),
    payloadDigest: varchar("payload_digest", { length: 64 }).notNull(),
    termsVersion: varchar("terms_version", { length: 64 }).notNull(),
    privacyPolicyVersion: varchar("privacy_policy_version", {
      length: 64,
    }).notNull(),
    marketingConsentVersion: varchar("marketing_consent_version", {
      length: 64,
    }).notNull(),
    marketingConsent: boolean("marketing_consent").notNull(),
    marketingConsentedAt: timestamp("marketing_consented_at", {
      withTimezone: true,
    }),
    requestedProductSlugs: jsonb("requested_product_slugs")
      .$type<string[]>()
      .notNull(),
    deliveryStatus: varchar("delivery_status", { length: 32 })
      .notNull()
      .default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("acquisition_requests_idempotency_key_unique").on(
      table.idempotencyKey,
    ),
    index("acquisition_requests_recipient_created_idx").on(
      table.recipientId,
      table.createdAt,
    ),
    check(
      "acquisition_requests_payload_digest_check",
      sql`${table.payloadDigest} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "acquisition_requests_product_slugs_check",
      sql`jsonb_typeof(${table.requestedProductSlugs}) = 'array' and jsonb_array_length(${table.requestedProductSlugs}) > 0`,
    ),
    check(
      "acquisition_requests_delivery_status_check",
      sql`${table.deliveryStatus} in ('pending', 'accepted', 'rejected')`,
    ),
    check(
      "acquisition_requests_marketing_consent_check",
      sql`(${table.marketingConsent} and ${table.marketingConsentedAt} is not null) or (not ${table.marketingConsent} and ${table.marketingConsentedAt} is null)`,
    ),
  ],
);

export const acquisitionsTable = appSchema.table(
  "acquisitions",
  {
    id: serial("id").primaryKey(),
    recipientId: integer("recipient_id")
      .notNull()
      .references(() => storeRecipientsTable.id),
    productId: integer("product_id")
      .notNull()
      .references(() => productsTable.id),
    firstRequestedAt: timestamp("first_requested_at", {
      withTimezone: true,
    }).notNull(),
    lastRequestedAt: timestamp("last_requested_at", {
      withTimezone: true,
    }).notNull(),
    requestCount: integer("request_count").notNull().default(1),
  },
  (table) => [
    uniqueIndex("acquisitions_recipient_product_unique").on(
      table.recipientId,
      table.productId,
    ),
    check("acquisitions_request_count_check", sql`${table.requestCount} > 0`),
  ],
);

export const storeOrdersTable = appSchema.table(
  "store_orders",
  {
    id: uuid("id").primaryKey(),
    recipientId: integer("recipient_id")
      .notNull()
      .references(() => storeRecipientsTable.id),
    idempotencyKey: varchar("idempotency_key", { length: 128 }).notNull(),
    payloadDigest: varchar("payload_digest", { length: 64 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    status: varchar("status", { length: 16 }).notNull().default("pending"),
    checkoutSessionId: varchar("checkout_session_id", { length: 255 }),
    checkoutUrl: text("checkout_url"),
    paymentIntentId: varchar("payment_intent_id", { length: 255 }),
    chargedMinorUnits: integer("charged_minor_units"),
    chargedCurrency: varchar("charged_currency", { length: 3 }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    termsVersion: varchar("terms_version", { length: 64 }).notNull(),
    privacyPolicyVersion: varchar("privacy_policy_version", {
      length: 64,
    }).notNull(),
    marketingConsentVersion: varchar("marketing_consent_version", {
      length: 64,
    }).notNull(),
    marketingConsent: boolean("marketing_consent").notNull(),
    marketingConsentedAt: timestamp("marketing_consented_at", {
      withTimezone: true,
    }),
    deliveryConsentTermsVersion: varchar("delivery_consent_terms_version", {
      length: 64,
    }).notNull(),
    deliveryConsentedAt: timestamp("delivery_consented_at", {
      withTimezone: true,
    }).notNull(),
    placedAt: timestamp("placed_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("store_orders_idempotency_key_unique").on(table.idempotencyKey),
    uniqueIndex("store_orders_checkout_session_unique").on(
      table.checkoutSessionId,
    ),
    index("store_orders_recipient_placed_idx").on(
      table.recipientId,
      table.placedAt,
    ),
    check(
      "store_orders_payload_digest_check",
      sql`${table.payloadDigest} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "store_orders_currency_check",
      sql`${table.currency} in ('EUR', 'USD')`,
    ),
    check(
      "store_orders_status_check",
      sql`${table.status} in ('pending', 'paid')`,
    ),
    check(
      "store_orders_checkout_check",
      sql`(${table.checkoutSessionId} is null) = (${table.checkoutUrl} is null)`,
    ),
    check(
      "store_orders_payment_check",
      sql`(${table.status} = 'paid' and ${table.checkoutSessionId} is not null and ${table.chargedMinorUnits} is not null and ${table.chargedMinorUnits} >= 0 and ${table.chargedCurrency} is not null and ${table.paidAt} is not null) or (${table.status} = 'pending' and ${table.paymentIntentId} is null and ${table.chargedMinorUnits} is null and ${table.chargedCurrency} is null and ${table.paidAt} is null)`,
    ),
    check(
      "store_orders_marketing_consent_check",
      sql`(${table.marketingConsent} and ${table.marketingConsentedAt} is not null) or (not ${table.marketingConsent} and ${table.marketingConsentedAt} is null)`,
    ),
  ],
);

export const storeOrderItemsTable = appSchema.table(
  "store_order_items",
  {
    orderId: uuid("order_id")
      .notNull()
      .references(() => storeOrdersTable.id),
    position: integer("position").notNull(),
    productId: integer("product_id")
      .notNull()
      .references(() => productsTable.id),
    productVersionId: integer("product_version_id")
      .notNull()
      .references(() => productVersionsTable.id),
    title: varchar("title", { length: 240 }).notNull(),
    amountMinorUnits: integer("amount_minor_units").notNull(),
  },
  (table) => [
    primaryKey({
      name: "store_order_items_pkey",
      columns: [table.orderId, table.position],
    }),
    uniqueIndex("store_order_items_order_version_unique").on(
      table.orderId,
      table.productVersionId,
    ),
    check("store_order_items_position_check", sql`${table.position} >= 0`),
    check(
      "store_order_items_amount_check",
      sql`${table.amountMinorUnits} >= 0`,
    ),
  ],
);

export const deliveryAttemptsTable = appSchema.table(
  "delivery_attempts",
  {
    id: serial("id").primaryKey(),
    requestId: integer("request_id").references(
      () => acquisitionRequestsTable.id,
    ),
    orderId: uuid("order_id").references(() => storeOrdersTable.id),
    provider: varchar("provider", { length: 64 }).notNull(),
    providerIdempotencyKey: varchar("provider_idempotency_key", {
      length: 128,
    }).notNull(),
    providerMessageId: varchar("provider_message_id", { length: 255 }),
    status: varchar("status", { length: 32 }).notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("delivery_attempts_request_created_idx").on(
      table.requestId,
      table.createdAt,
    ),
    index("delivery_attempts_order_created_idx").on(
      table.orderId,
      table.createdAt,
    ),
    check(
      "delivery_attempts_owner_check",
      sql`num_nonnulls(${table.requestId}, ${table.orderId}) = 1`,
    ),
    check(
      "delivery_attempts_status_check",
      sql`${table.status} in ('pending', 'accepted', 'rejected', 'retryable')`,
    ),
    check(
      "delivery_attempts_provider_message_check",
      sql`(${table.status} = 'accepted' and ${table.providerMessageId} is not null and length(btrim(${table.providerMessageId})) > 0) or (${table.status} <> 'accepted' and ${table.providerMessageId} is null)`,
    ),
  ],
);

export const downloadGrantsTable = appSchema.table(
  "download_grants",
  {
    id: serial("id").primaryKey(),
    requestId: integer("request_id").references(
      () => acquisitionRequestsTable.id,
    ),
    orderId: uuid("order_id").references(() => storeOrdersTable.id),
    tokenSha256: varchar("token_sha256", { length: 64 }).notNull(),
    status: varchar("status", { length: 32 }).notNull().default("active"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("download_grants_request_unique").on(table.requestId),
    uniqueIndex("download_grants_order_unique").on(table.orderId),
    check(
      "download_grants_owner_check",
      sql`num_nonnulls(${table.requestId}, ${table.orderId}) = 1`,
    ),
    uniqueIndex("download_grants_token_sha256_unique").on(table.tokenSha256),
    index("download_grants_expiry_idx").on(table.expiresAt),
    check(
      "download_grants_status_check",
      sql`${table.status} in ('active', 'revoked')`,
    ),
    check(
      "download_grants_token_sha256_check",
      sql`${table.tokenSha256} ~ '^[0-9a-f]{64}$'`,
    ),
  ],
);

export const downloadGrantItemsTable = appSchema.table(
  "download_grant_items",
  {
    grantId: integer("grant_id")
      .notNull()
      .references(() => downloadGrantsTable.id),
    productVersionId: integer("product_version_id")
      .notNull()
      .references(() => productVersionsTable.id),
  },
  (table) => [
    primaryKey({
      name: "download_grant_items_pkey",
      columns: [table.grantId, table.productVersionId],
    }),
  ],
);
