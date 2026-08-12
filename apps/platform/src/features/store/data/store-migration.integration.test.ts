import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { StoreMigrationTestContext } from "./store-migration-test-context";

const migrationTestContext = new StoreMigrationTestContext();

type TaxonomyRow = {
  slug: string;
  label: string;
  displayOrder: number;
};

type TableRow = {
  tableName: string;
};

describe.sequential("Store foundation migration", () => {
  beforeAll(async () => {
    await migrationTestContext.startAtLastPreStoreMigration();
    await migrationTestContext.applyCurrentApplicationMigrations();
  });

  afterAll(async () => {
    await migrationTestContext.stop();
  });

  it("creates the complete Store catalog and acquisition table set", async () => {
    // arrange
    const expectedTables = [
      "acquisition_requests",
      "acquisitions",
      "delivery_attempts",
      "download_grant_items",
      "download_grants",
      "product_goals",
      "product_types",
      "product_version_assets",
      "product_version_goal_assignments",
      "product_version_type_assignments",
      "product_versions",
      "products",
      "store_asset_identities",
      "store_recipients",
    ];

    // act
    const rows = await migrationTestContext.queryRows<TableRow>({
      sql: `
        select table_name as "tableName"
        from information_schema.tables
        where table_schema = 'app'
          and table_name = any($1)
        order by table_name
      `,
      values: [expectedTables],
    });

    // assert
    expect(rows.map((row) => row.tableName)).toEqual(expectedTables);
  });

  it("seeds controlled Types in prototype display order", async () => {
    // arrange
    // act
    const rows = await migrationTestContext.queryRows<TaxonomyRow>({
      sql: `
        select slug, display_label as "label", display_order as "displayOrder"
        from app.product_types
        order by display_order
      `,
      values: [],
    });

    // assert
    expect(rows).toEqual([
      { slug: "workouts", label: "Workouts", displayOrder: 1 },
      {
        slug: "nutrition-plans",
        label: "Nutrition Plans",
        displayOrder: 2,
      },
      { slug: "e-books", label: "E-Books", displayOrder: 3 },
    ]);
  });

  it("seeds controlled Goals in prototype display order", async () => {
    // arrange
    // act
    const rows = await migrationTestContext.queryRows<TaxonomyRow>({
      sql: `
        select slug, display_label as "label", display_order as "displayOrder"
        from app.product_goals
        order by display_order
      `,
      values: [],
    });

    // assert
    expect(rows).toEqual([
      {
        slug: "muscle-building",
        label: "Muscle Building",
        displayOrder: 1,
      },
      { slug: "fat-loss", label: "Fat Loss", displayOrder: 2 },
      { slug: "wellness", label: "Wellness", displayOrder: 3 },
      {
        slug: "hormonal-balance",
        label: "Hormonal Balance",
        displayOrder: 4,
      },
    ]);
  });

  it("enforces stable format-safe controlled taxonomy slugs", async () => {
    // arrange
    // act
    const invalidTypeSlug = migrationTestContext.queryRows({
      sql: `
        insert into app.product_types (slug, display_label, display_order)
        values ('Invalid Type', 'Invalid Type', 91)
      `,
      values: [],
    });
    const invalidGoalSlug = migrationTestContext.queryRows({
      sql: `
        insert into app.product_goals (slug, display_label, display_order)
        values ('../invalid-goal', 'Invalid Goal', 92)
      `,
      values: [],
    });
    const typeSlugMutation = migrationTestContext.queryRows({
      sql: `
        update app.product_types
        set slug = 'renamed-workouts'
        where slug = 'workouts'
      `,
      values: [],
    });
    const goalSlugMutation = migrationTestContext.queryRows({
      sql: `
        update app.product_goals
        set slug = 'renamed-wellness'
        where slug = 'wellness'
      `,
      values: [],
    });

    // assert
    await Promise.all([
      expect(invalidTypeSlug).rejects.toMatchObject({
        code: "23514",
        constraint: "product_types_slug_format_check",
      }),
      expect(invalidGoalSlug).rejects.toMatchObject({
        code: "23514",
        constraint: "product_goals_slug_format_check",
      }),
      expect(typeSlugMutation).rejects.toThrow(
        "Store taxonomy slugs are immutable.",
      ),
      expect(goalSlugMutation).rejects.toThrow(
        "Store taxonomy slugs are immutable.",
      ),
    ]);
  });

  it("binds every filesystem asset key to one immutable identity", async () => {
    // arrange
    await migrationTestContext.queryRows({
      sql: `
        insert into app.products (slug, lifecycle_status, display_order)
        values
          ('asset-identity-one', 'draft', 81),
          ('asset-identity-two', 'draft', 82)
      `,
      values: [],
    });
    await migrationTestContext.queryRows({
      sql: `
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
        select
          id,
          1,
          'Asset Identity One',
          'Eli',
          'Asset identity fixture.',
          'Asset identity fixture.',
          '[]'::jsonb,
          'covers/shared-identity.webp',
          'Shared fixture cover',
          'image/webp',
          128,
          repeat('a', 64)
        from app.products
        where slug = 'asset-identity-one'
      `,
      values: [],
    });

    // act
    const conflictingIdentity = migrationTestContext.queryRows({
      sql: `
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
        select
          id,
          1,
          'Asset Identity Two',
          'Eli',
          'Asset identity fixture.',
          'Asset identity fixture.',
          '[]'::jsonb,
          'covers/shared-identity.webp',
          'Conflicting fixture cover',
          'image/webp',
          256,
          repeat('b', 64)
        from app.products
        where slug = 'asset-identity-two'
      `,
      values: [],
    });
    const traversingIdentity = migrationTestContext.queryRows({
      sql: `
        insert into app.store_asset_identities (
          asset_key,
          mime_type,
          size_bytes,
          sha256
        )
        values (
          'covers/../escape.webp',
          'image/webp',
          128,
          repeat('b', 64)
        )
      `,
      values: [],
    });

    // assert
    await expect(conflictingIdentity).rejects.toThrow(
      "Store asset keys must retain one immutable identity.",
    );
    await expect(traversingIdentity).rejects.toMatchObject({
      code: "23514",
      constraint: "store_asset_identities_relative_key_check",
    });
    const identities = await migrationTestContext.queryRows<{
      assetKey: string;
      sha256: string;
      sizeBytes: number;
    }>({
      sql: `
        select
          asset_key as "assetKey",
          sha256,
          size_bytes as "sizeBytes"
        from app.store_asset_identities
        where asset_key = 'covers/shared-identity.webp'
      `,
      values: [],
    });
    expect(identities).toEqual([
      {
        assetKey: "covers/shared-identity.webp",
        sha256: "a".repeat(64),
        sizeBytes: 128,
      },
    ]);
  });

  it("preserves delivery-attempt provenance and exact issued grants", async () => {
    // arrange
    await migrationTestContext.queryRows({
      sql: `
        insert into app.store_recipients (
          normalized_email,
          delivery_limit_key
        )
        values ('grant-fixture@example.com', 'grant-fixture@example.com')
      `,
      values: [],
    });
    await migrationTestContext.queryRows({
      sql: `
        insert into app.products (slug, lifecycle_status, display_order)
        values ('grant-fixture', 'draft', 83)
      `,
      values: [],
    });
    await migrationTestContext.queryRows({
      sql: `
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
        select
          id,
          1,
          'Grant Fixture',
          'Eli',
          'Grant fixture.',
          'Grant fixture.',
          '[]'::jsonb,
          'covers/grant-fixture.webp',
          'Grant fixture cover',
          'image/webp',
          128,
          repeat('c', 64)
        from app.products
        where slug = 'grant-fixture'
      `,
      values: [],
    });
    await migrationTestContext.queryRows({
      sql: `
        insert into app.acquisition_requests (
          recipient_id,
          idempotency_key,
          payload_digest,
          terms_version,
          privacy_policy_version,
          marketing_consent_version,
          marketing_consent,
          marketing_consented_at,
          requested_product_slugs
        )
        select
          id,
          'grant-fixture-request',
          repeat('d', 64),
          '1.0',
          '2.0',
          '1.0',
          false,
          null,
          '["grant-fixture"]'::jsonb
        from app.store_recipients
        where normalized_email = 'grant-fixture@example.com'
      `,
      values: [],
    });
    await migrationTestContext.queryRows({
      sql: `
        insert into app.acquisition_requests (
          recipient_id,
          idempotency_key,
          payload_digest,
          terms_version,
          privacy_policy_version,
          marketing_consent_version,
          marketing_consent,
          marketing_consented_at,
          requested_product_slugs
        )
        select
          id,
          'unissued-grant-fixture-request',
          repeat('f', 64),
          '1.0',
          '2.0',
          '1.0',
          false,
          null,
          '["grant-fixture"]'::jsonb
        from app.store_recipients
        where normalized_email = 'grant-fixture@example.com'
      `,
      values: [],
    });
    await migrationTestContext.queryRows({
      sql: `
        insert into app.download_grants (
          request_id,
          token_sha256,
          expires_at
        )
        select
          id,
          repeat('e', 64),
          '2026-08-06T12:00:00.000Z'
        from app.acquisition_requests
        where idempotency_key = 'grant-fixture-request'
      `,
      values: [],
    });
    await migrationTestContext.queryRows({
      sql: `
        insert into app.download_grant_items (grant_id, product_version_id)
        select download_grant.id, version.id
        from app.download_grants download_grant
        join app.acquisition_requests request
          on request.id = download_grant.request_id
        join app.product_versions version on true
        join app.products product on product.id = version.product_id
        where request.idempotency_key = 'grant-fixture-request'
          and product.slug = 'grant-fixture'
      `,
      values: [],
    });
    await migrationTestContext.queryRows({
      sql: `
        insert into app.delivery_attempts (
          request_id,
          provider,
          provider_idempotency_key
        )
        select id, 'resend', idempotency_key
        from app.acquisition_requests
        where idempotency_key = 'grant-fixture-request'
      `,
      values: [],
    });

    // act
    await migrationTestContext.queryRows({
      sql: `
        insert into app.delivery_attempts (
          request_id,
          provider,
          provider_idempotency_key
        )
        select id, 'resend', idempotency_key
        from app.acquisition_requests
        where idempotency_key = 'grant-fixture-request'
      `,
      values: [],
    });
    const changedProvider = migrationTestContext.queryRows({
      sql: `
        insert into app.delivery_attempts (
          request_id,
          provider,
          provider_idempotency_key
        )
        select id, 'replacement-provider', idempotency_key
        from app.acquisition_requests
        where idempotency_key = 'grant-fixture-request'
      `,
      values: [],
    });
    const changedExpiry = migrationTestContext.queryRows({
      sql: `
        update app.download_grants
        set expires_at = '2027-01-01T00:00:00.000Z'
        where token_sha256 = repeat('e', 64)
      `,
      values: [],
    });
    const deletedItem = migrationTestContext.queryRows({
      sql: `
        delete from app.download_grant_items
        where grant_id = (
          select id
          from app.download_grants
          where token_sha256 = repeat('e', 64)
        )
      `,
      values: [],
    });
    const reparentedGrant = migrationTestContext.queryRows({
      sql: `
        update app.download_grants
        set request_id = (
          select id
          from app.acquisition_requests
          where idempotency_key = 'unissued-grant-fixture-request'
        )
        where token_sha256 = repeat('e', 64)
      `,
      values: [],
    });
    const [
      changedProviderResult,
      changedExpiryResult,
      deletedItemResult,
      reparentedGrantResult,
    ] = await Promise.allSettled([
      changedProvider,
      changedExpiry,
      deletedItem,
      reparentedGrant,
    ]);
    await migrationTestContext.queryRows({
      sql: `
        update app.download_grants
        set status = 'revoked'
        where token_sha256 = repeat('e', 64)
      `,
      values: [],
    });
    const [reactivationResult] = await Promise.allSettled([
      migrationTestContext.queryRows({
        sql: `
          update app.download_grants
          set status = 'active'
          where token_sha256 = repeat('e', 64)
        `,
        values: [],
      }),
    ]);

    // assert
    expect(changedProviderResult).toMatchObject({
      reason: expect.objectContaining({
        message: expect.stringContaining(
          "Delivery retries must retain their original provider namespace.",
        ),
      }),
      status: "rejected",
    });
    expect(changedExpiryResult).toMatchObject({
      reason: expect.objectContaining({
        message: expect.stringContaining(
          "Issued download grants are immutable.",
        ),
      }),
      status: "rejected",
    });
    expect(deletedItemResult).toMatchObject({
      reason: expect.objectContaining({
        message: expect.stringContaining(
          "Issued download grant items are immutable.",
        ),
      }),
      status: "rejected",
    });
    expect(reparentedGrantResult).toMatchObject({
      reason: expect.objectContaining({
        message: expect.stringContaining(
          "Issued download grants are immutable.",
        ),
      }),
      status: "rejected",
    });
    expect(reactivationResult).toMatchObject({
      reason: expect.objectContaining({
        message: expect.stringContaining(
          "Issued download grants are immutable.",
        ),
      }),
      status: "rejected",
    });
  });

  it("rejects moving published version content to a draft version", async () => {
    // arrange
    await migrationTestContext.queryRows({
      sql: `
        insert into app.products (slug, lifecycle_status, display_order)
        values
          ('immutable-guide', 'published', 101),
          ('draft-guide', 'draft', 102)
      `,
      values: [],
    });
    await migrationTestContext.queryRows({
      sql: `
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
          cover_sha256,
          published_at
        )
        select
          id,
          1,
          initcap(replace(slug, '-', ' ')),
          'Eli',
          'Migration trigger fixture.',
          'Migration trigger fixture.',
          '[]'::jsonb,
          'covers/' || slug || '.webp',
          'Guide cover',
          'image/webp',
          1,
          repeat('a', 64),
          null
        from app.products
        where slug in ('immutable-guide', 'draft-guide')
      `,
      values: [],
    });
    await migrationTestContext.queryRows({
      sql: `
        insert into app.product_version_assets (
          product_version_id,
          asset_key,
          customer_filename,
          mime_type,
          size_bytes,
          sha256
        )
        select
          version.id,
          'products/immutable-guide.pdf',
          'immutable-guide.pdf',
          'application/pdf',
          1,
          repeat('b', 64)
        from app.product_versions version
        inner join app.products product on product.id = version.product_id
        where product.slug = 'immutable-guide'
      `,
      values: [],
    });
    await migrationTestContext.queryRows({
      sql: `
        update app.product_versions version
        set published_at = now()
        from app.products product
        where product.id = version.product_id
          and product.slug = 'immutable-guide'
      `,
      values: [],
    });

    // act
    const mutation = migrationTestContext.queryRows({
      sql: `
        update app.product_version_assets
        set product_version_id = (
          select version.id
          from app.product_versions version
          inner join app.products product on product.id = version.product_id
          where product.slug = 'draft-guide'
        )
        where asset_key = 'products/immutable-guide.pdf'
      `,
      values: [],
    });

    // assert
    await expect(mutation).rejects.toThrow(
      "Published product version content is immutable.",
    );
  });

  it("rejects duplicate public product slugs", async () => {
    // arrange
    await migrationTestContext.queryRows({
      sql: `
        insert into app.products (slug, lifecycle_status, display_order)
        values ('unique-guide', 'draft', 103)
      `,
      values: [],
    });

    // act
    const duplicate = migrationTestContext.queryRows({
      sql: `
        insert into app.products (slug, lifecycle_status, display_order)
        values ('unique-guide', 'draft', 104)
      `,
      values: [],
    });

    // assert
    await expect(duplicate).rejects.toMatchObject({ code: "23505" });
  });

  it("rejects absolute and traversing cover asset keys", async () => {
    // arrange
    await migrationTestContext.queryRows({
      sql: `
        insert into app.products (slug, lifecycle_status, display_order)
        values ('invalid-cover-guide', 'draft', 105)
      `,
      values: [],
    });
    const insertVersion = (coverAssetKey: string) =>
      migrationTestContext.queryRows({
        sql: `
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
          select
            id,
            1,
            'Invalid Cover Guide',
            'Eli',
            'Migration constraint fixture.',
            'Migration constraint fixture.',
            '[]'::jsonb,
            $1,
            'Guide cover',
            'image/webp',
            1,
            repeat('c', 64)
          from app.products
          where slug = 'invalid-cover-guide'
        `,
        values: [coverAssetKey],
      });

    // act
    const absoluteCover = insertVersion("/private/guide.webp");
    const traversingCover = insertVersion("covers/../private.webp");
    const blankCover = insertVersion("   ");

    // assert
    await Promise.all([
      expect(absoluteCover).rejects.toMatchObject({
        code: "23514",
        constraint: "store_asset_identities_relative_key_check",
      }),
      expect(traversingCover).rejects.toMatchObject({
        code: "23514",
        constraint: "store_asset_identities_relative_key_check",
      }),
      expect(blankCover).rejects.toMatchObject({
        code: "23514",
        constraint: "store_asset_identities_relative_key_check",
      }),
    ]);
  });

  it("rejects active content types for public cover assets", async () => {
    // arrange
    await migrationTestContext.queryRows({
      sql: `
        insert into app.products (slug, lifecycle_status, display_order)
        values ('active-cover-guide', 'draft', 108)
      `,
      values: [],
    });

    // act
    const activeCover = migrationTestContext.queryRows({
      sql: `
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
        select
          id,
          1,
          'Active Cover Guide',
          'Eli',
          'Migration constraint fixture.',
          'Migration constraint fixture.',
          '[]'::jsonb,
          'covers/active.html',
          'Guide cover',
          'text/html',
          1,
          repeat('c', 64)
        from app.products
        where slug = 'active-cover-guide'
      `,
      values: [],
    });

    // assert
    await expect(activeCover).rejects.toMatchObject({
      code: "23514",
      constraint: "product_versions_cover_mime_type_check",
    });
  });

  it("requires a downloadable asset before a version can be published", async () => {
    // arrange
    await migrationTestContext.queryRows({
      sql: `
        insert into app.products (slug, lifecycle_status, display_order)
        values ('empty-published-guide', 'draft', 109)
      `,
      values: [],
    });
    await migrationTestContext.queryRows({
      sql: `
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
        select
          id,
          1,
          'Empty Published Guide',
          'Eli',
          'Migration trigger fixture.',
          'Migration trigger fixture.',
          '[]'::jsonb,
          'covers/empty.webp',
          'Guide cover',
          'image/webp',
          1,
          repeat('c', 64)
        from app.products
        where slug = 'empty-published-guide'
      `,
      values: [],
    });

    // act
    const publishEmptyVersion = migrationTestContext.queryRows({
      sql: `
        update app.product_versions version
        set published_at = now()
        from app.products product
        where product.id = version.product_id
          and product.slug = 'empty-published-guide'
      `,
      values: [],
    });

    // assert
    await expect(publishEmptyVersion).rejects.toThrow(
      "Published product versions require at least one downloadable asset.",
    );
  });

  it("rejects unsafe download asset keys and customer filenames", async () => {
    // arrange
    await migrationTestContext.queryRows({
      sql: `
        insert into app.products (slug, lifecycle_status, display_order)
        values ('invalid-download-guide', 'draft', 106)
      `,
      values: [],
    });
    await migrationTestContext.queryRows({
      sql: `
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
        select
          id,
          1,
          'Invalid Download Guide',
          'Eli',
          'Migration constraint fixture.',
          'Migration constraint fixture.',
          '[]'::jsonb,
          'covers/valid.webp',
          'Guide cover',
          'image/webp',
          1,
          repeat('d', 64)
        from app.products
        where slug = 'invalid-download-guide'
      `,
      values: [],
    });
    const insertAsset = (assetKey: string, customerFilename: string) =>
      migrationTestContext.queryRows({
        sql: `
          insert into app.product_version_assets (
            product_version_id,
            asset_key,
            customer_filename,
            mime_type,
            size_bytes,
            sha256
          )
          select
            version.id,
            $1,
            $2,
            'application/pdf',
            1,
            repeat('e', 64)
          from app.product_versions version
          inner join app.products product on product.id = version.product_id
          where product.slug = 'invalid-download-guide'
        `,
        values: [assetKey, customerFilename],
      });

    // act
    const absoluteAsset = insertAsset("/private/guide.pdf", "guide.pdf");
    const traversingAsset = insertAsset(
      "products/../private.pdf",
      "private.pdf",
    );
    const unsafeFilename = insertAsset(
      "products/guide.pdf",
      "..\\escape.pdf",
    );
    const blankAsset = insertAsset("   ", "blank.pdf");

    // assert
    await Promise.all([
      expect(absoluteAsset).rejects.toMatchObject({
        code: "23514",
        constraint: "store_asset_identities_relative_key_check",
      }),
      expect(traversingAsset).rejects.toMatchObject({
        code: "23514",
        constraint: "store_asset_identities_relative_key_check",
      }),
      expect(unsafeFilename).rejects.toMatchObject({
        code: "23514",
        constraint: "product_version_assets_customer_filename_check",
      }),
      expect(blankAsset).rejects.toMatchObject({
        code: "23514",
        constraint: "store_asset_identities_relative_key_check",
      }),
    ]);
  });

  it("rejects duplicate customer filenames within one product version", async () => {
    // arrange
    const insertDuplicateFilenames = () =>
      migrationTestContext.queryRows({
        sql: `
        with inserted_product as (
          insert into app.products (
            slug,
            lifecycle_status,
            display_order
          )
          values ('duplicate-filename-guide', 'draft', 107)
          returning id
        ),
        inserted_version as (
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
          select
            id,
            1,
            'Duplicate Filename Guide',
            'Eli',
            'Migration constraint fixture.',
            'Migration constraint fixture.',
            '[]'::jsonb,
            'covers/valid.webp',
            'Guide cover',
            'image/webp',
            1,
            repeat('d', 64)
          from inserted_product
          returning id
        )
        insert into app.product_version_assets (
          product_version_id,
          asset_key,
          customer_filename,
          mime_type,
          size_bytes,
          sha256
        )
        select
          version.id,
          fixture.asset_key,
          'guide.pdf',
          'application/pdf',
          1,
          repeat('e', 64)
        from inserted_version version
        cross join (
          values ('products/guide-one.pdf'), ('products/guide-two.pdf')
        ) as fixture(asset_key)
        `,
        values: [],
      });

    // act
    const duplicateFilenames = insertDuplicateFilenames();

    // assert
    await expect(duplicateFilenames).rejects.toMatchObject({
      code: "23505",
      constraint: "product_version_assets_customer_filename_unique",
    });
  });
});
