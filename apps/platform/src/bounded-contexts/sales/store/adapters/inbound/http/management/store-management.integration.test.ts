import { readdir } from "node:fs/promises";

import { STORE_ACQUISITION_TURNSTILE_ACTION } from "~/shared/submission-checks/bot-detection";
import { MAX_PUBLICATION_BYTES } from "~/bounded-contexts/sales/store/domain/product";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import {
  ApiIntegrationTestSuite,
  type SentEmail,
} from "~integration-test-config/api-integration-test-suite";
import {
  CLIENT_SESSION,
  COACH_SESSION,
  PlatformRig,
} from "~integration-test-config/platform-rig";
import {
  CLERK_API_KEY_VERIFICATION_PATH,
  clerkFailsToVerifyApiKeys,
  clerkVerifiesApiKey,
} from "~integration-test-config/wire-mock/expectations/clerk-backend-api";
import { turnstileTokenForAction } from "~integration-test-config/wire-mock/expectations/turnstile-siteverify";

const suite = new ApiIntegrationTestSuite();
const rig = new PlatformRig(suite);
const CLIENT_API_KEY_SECRET = "ak_platformrigclient";
const UNPROVISIONED_API_KEY_SECRET = "ak_platformrigunprovisioned";
const UNPROVISIONED_SUBJECT_ID = "user_platformrigunprovisioned";
let managementAuthorization = "";
const storeSubmissionToken = turnstileTokenForAction(
  STORE_ACQUISITION_TURNSTILE_ACTION,
);

const PNG_BYTES = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x11, 0x22,
]);
const PDF_BYTES = Uint8Array.from(
  new TextEncoder().encode("%PDF-1.4 a published guide"),
);
const REVISED_PDF_BYTES = Uint8Array.from(
  new TextEncoder().encode("%PDF-1.4 a revised guide"),
);

type PublicationBody = {
  publication: {
    id: number;
    operation: string;
    pricing?: Record<string, unknown>;
    productId: number;
    productSlug: string;
    productVersionId: number | null;
    replayed: boolean;
  };
};

const PAID_PRICE = { eurCents: 3900, usdCents: 4500 };
const PAID_PRICING = { kind: "paid", ...PAID_PRICE };
const FREE_PRICING = { kind: "free" };

describe("Store management integration", () => {
  beforeAll(async () => {
    await suite.start();
  });

  beforeEach(async () => {
    managementAuthorization = await rig.authorizeStorePublishing();
  });

  afterEach(async () => {
    await suite.reset();
  });

  afterAll(async () => {
    await suite.stop();
  });

  it("refuses a key Clerk does not know without storing the upload", async () => {
    // arrange
    const request = publicationRequest({ credential: "Bearer ak_unknown" });

    // act
    const response = await suite.request(request);

    // assert
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({
      error: { code: "unauthorized" },
    });
    await expect(assetRootEntries()).resolves.toEqual([]);
  });

  it("refuses the retired shared management secret as an unknown key", async () => {
    // arrange
    const request = publicationRequest({
      credential: "Bearer integration-management-api-secret-value",
    });

    // act
    const response = await suite.request(request);

    // assert
    expect(response.status).toBe(401);
    await expect(assetRootEntries()).resolves.toEqual([]);
  });

  it("refuses a request without a credential before asking Clerk", async () => {
    // arrange
    const request = publicationRequest();
    request.headers.delete("authorization");

    // act
    const response = await suite.request(request);

    // assert
    expect(response.status).toBe(401);
    await expect(
      suite.wireMock.recordedRequests(CLERK_API_KEY_VERIFICATION_PATH),
    ).resolves.toEqual([]);
    await expect(assetRootEntries()).resolves.toEqual([]);
  });

  it("forbids a client's key without storing the upload", async () => {
    // arrange
    await rig.provisionClient();
    await suite.wireMock.stub(
      clerkVerifiesApiKey({
        secret: CLIENT_API_KEY_SECRET,
        subjectId: CLIENT_SESSION.subjectId,
      }),
    );

    // act
    const response = await suite.request(
      publicationRequest({ credential: `Bearer ${CLIENT_API_KEY_SECRET}` }),
    );

    // assert
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      error: { code: "forbidden" },
    });
    await expect(assetRootEntries()).resolves.toEqual([]);
  });

  it("forbids a key whose user has no account, and creates none", async () => {
    // arrange
    await suite.wireMock.stub(
      clerkVerifiesApiKey({
        secret: UNPROVISIONED_API_KEY_SECRET,
        subjectId: UNPROVISIONED_SUBJECT_ID,
      }),
    );

    // act
    const response = await suite.request(
      publicationRequest({
        credential: `Bearer ${UNPROVISIONED_API_KEY_SECRET}`,
      }),
    );

    // assert
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      error: { code: "forbidden" },
    });
    await expect(
      suite.postgres.countRows({
        tableName: "app.accounts",
        values: [UNPROVISIONED_SUBJECT_ID],
        whereClause: "auth_subject_id = $1",
      }),
    ).resolves.toBe(0);
    await expect(assetRootEntries()).resolves.toEqual([]);
  });

  it("answers temporarily unavailable when Clerk cannot check the key", async () => {
    // arrange
    await suite.wireMock.stub(clerkFailsToVerifyApiKeys);

    // act
    const response = await suite.request(publicationRequest());

    // assert
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      error: { code: "auth_unavailable" },
    });
    await expect(assetRootEntries()).resolves.toEqual([]);
  });

  it("refuses management traffic arriving over plaintext outside LOCAL", async () => {
    // arrange
    const request = publicationRequest({ forwardedProtocol: "http" });

    // act
    const response = await suite.request(request);

    // assert
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      error: { code: "insecure_transport" },
    });
    await expect(assetRootEntries()).resolves.toEqual([]);
  });

  it("refuses an upload beyond the publication ceiling", async () => {
    // arrange
    const request = oversizedPublicationRequest(managementAuthorization);

    // act
    const response = await suite.request(request);

    // assert
    expect(response.status).toBe(413);
    await expect(assetRootEntries()).resolves.toEqual([]);
  });

  it("checks the credential before reading an oversized upload", async () => {
    // arrange
    const request = oversizedPublicationRequest("Bearer ak_unknown");

    // act
    const response = await suite.request(request);

    // assert
    expect(response.status).toBe(401);
    await expect(assetRootEntries()).resolves.toEqual([]);
  });

  it("rejects unknown taxonomy with the accepted values and writes nothing", async () => {
    // arrange
    // act
    const response = await suite.request(
      publicationRequest({
        metadata: { typeSlugs: ["meal-prep"], goalSlugs: ["fat-loss"] },
      }),
    );

    // assert
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: {
        code: "validation_failed",
        issues: expect.arrayContaining([
          expect.objectContaining({
            code: "unknown_type",
            slug: "meal-prep",
            acceptedSlugs: ["workouts", "nutrition-plans", "e-books"],
          }),
        ]),
      },
    });
    await expect(assetRootEntries()).resolves.toEqual([]);
  });

  it("rejects a download whose bytes contradict its declared extension", async () => {
    // arrange
    // act
    const response = await suite.request(
      publicationRequest({ downloadBytes: PNG_BYTES }),
    );

    // assert
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: {
        issues: [
          {
            code: "download_content_mismatch",
            customerFilename: "GluteGrowthGuide.pdf",
          },
        ],
      },
    });
    await expect(assetRootEntries()).resolves.toEqual([]);
  });

  it("rejects a cover that is not an accepted image", async () => {
    // arrange
    // act
    const response = await suite.request(
      publicationRequest({ coverBytes: PDF_BYTES }),
    );

    // assert
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { issues: [{ code: "unsupported_cover_content" }] },
    });
  });

  it("returns a publication plan from a dry run while persisting nothing", async () => {
    // arrange
    // act
    const response = await suite.request(
      publicationRequest({ path: "/api/management/store/product-validations" }),
    );
    const body = (await response.json()) as { plan: Record<string, unknown> };
    const catalog = await readCatalog();

    // assert
    expect(response.status).toBe(200);
    expect(body.plan).toMatchObject({
      operation: "create_product",
      productId: null,
      productSlug: "glute-growth-guide",
      displayOrder: 1,
      versionSequence: 1,
      totalUploadBytes: PNG_BYTES.byteLength + PDF_BYTES.byteLength,
    });
    expect(catalog.products).toEqual([]);
    await expect(assetRootEntries()).resolves.toEqual([]);
  });

  it("publishes a product, stores its bytes, and shows it in the public catalog", async () => {
    // arrange
    // act
    const response = await suite.request(publicationRequest());
    const body = (await response.json()) as PublicationBody;
    const catalog = await readCatalog();

    // assert
    expect(response.status).toBe(201);
    expect(body.publication).toMatchObject({
      productSlug: "glute-growth-guide",
      replayed: false,
    });
    expect(catalog.products).toHaveLength(1);
    expect(catalog.products[0]).toMatchObject({
      slug: "glute-growth-guide",
      title: "Glute Growth Guide",
      types: [{ slug: "e-books" }],
      goals: [{ slug: "muscle-building" }],
    });
    await expect(assetRootEntries()).resolves.toEqual(["covers", "products"]);
  });

  it("records the coach's account as the publisher", async () => {
    // arrange
    // act
    const response = await suite.request(publicationRequest());

    // assert
    expect(response.status).toBe(201);
    await expect(
      suite.postgres.countRows({
        tableName: "app.product_publications",
        values: [COACH_SESSION.subjectId],
        whereClause:
          "published_by_kind = 'user' and published_by_id = (select id::text from app.accounts where auth_subject_id = $1)",
      }),
    ).resolves.toBe(1);
  });

  it("returns the same publication when an idempotency key is replayed", async () => {
    // arrange
    const first = await suite.request(publicationRequest());
    const firstBody = (await first.json()) as PublicationBody;

    // act
    const replay = await suite.request(publicationRequest());
    const replayBody = (await replay.json()) as PublicationBody;
    const catalog = await readCatalog();

    // assert
    expect(replay.status).toBe(200);
    expect(replayBody.publication.id).toBe(firstBody.publication.id);
    expect(replayBody.publication.replayed).toBe(true);
    expect(catalog.products).toHaveLength(1);
  });

  it("rejects an idempotency key reused with a different payload", async () => {
    // arrange
    await suite.request(publicationRequest());

    // act
    const response = await suite.request(
      publicationRequest({ metadata: { title: "A different title" } }),
    );

    // assert
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      error: { code: "idempotency_conflict" },
    });
  });

  it("rejects a second product claiming the same slug", async () => {
    // arrange
    await suite.request(publicationRequest());

    // act
    const response = await suite.request(
      publicationRequest({ idempotencyKey: "publish-2" }),
    );

    // assert
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { issues: [{ code: "slug_taken", slug: "glute-growth-guide" }] },
    });
  });

  it("keeps an earlier grant on its original version when a revision publishes", async () => {
    // arrange
    const published = await suite.request(publicationRequest());
    const { publication } = (await published.json()) as PublicationBody;
    const acquisition = await requestAcquisition(
      "early@example.com",
      "11111111-1111-4111-8111-111111111111",
    );

    expect(acquisition.status).toBe(201);

    const [deliveredEmail] = await suite.sentEmails();
    const grantToken = downloadTokenFrom(deliveredEmail!);

    // act
    const revision = await suite.request(
      publicationRequest({
        downloadBytes: REVISED_PDF_BYTES,
        idempotencyKey: "revise-1",
        metadata: { title: "Glute Growth Guide, second edition" },
        path: `/api/management/store/products/${publication.productId}/versions`,
      }),
    );
    const revisionBody = (await revision.json()) as PublicationBody;
    const catalog = await readCatalog();
    const download = await requestDownload(grantToken);

    // assert
    expect(revision.status).toBe(201);
    expect(revisionBody.publication.productId).toBe(publication.productId);
    expect(revisionBody.publication.productVersionId).not.toBe(
      publication.productVersionId,
    );
    expect(catalog.products).toHaveLength(1);
    expect(catalog.products[0]).toMatchObject({
      slug: "glute-growth-guide",
      title: "Glute Growth Guide, second edition",
    });
    expect(download.status).toBe(200);
    expect(await download.text()).toBe(new TextDecoder().decode(PDF_BYTES));
  });

  it("stops new acquisition on retirement while an issued grant still downloads", async () => {
    // arrange
    const published = await suite.request(publicationRequest());
    const { publication } = (await published.json()) as PublicationBody;

    await requestAcquisition(
      "owner@example.com",
      "22222222-2222-4222-8222-222222222222",
    );

    const [deliveredEmail] = await suite.sentEmails();
    const grantToken = downloadTokenFrom(deliveredEmail!);

    // act
    const retirement = await suite.request(
      new Request(
        suite.url(`/api/management/store/products/${publication.productId}`),
        {
          headers: {
            authorization: managementAuthorization,
            "x-forwarded-proto": "https",
          },
          method: "PATCH",
        },
      ),
    );
    const catalog = await readCatalog();
    const laterAcquisition = await requestAcquisition(
      "later@example.com",
      "33333333-3333-4333-8333-333333333333",
    );
    const download = await requestDownload(grantToken);

    // assert
    expect(retirement.status).toBe(200);
    expect(catalog.products).toEqual([]);
    expect(laterAcquisition.status).toBe(409);
    expect(await laterAcquisition.json()).toMatchObject({
      error: { code: "unavailable_products", availableProductSlugs: [] },
    });
    expect(download.status).toBe(200);
  });

  it("publishes a paid product and shows its fixed prices in the public catalog", async () => {
    // arrange
    // act
    const response = await suite.request(
      publicationRequest({ metadata: { pricing: PAID_PRICING } }),
    );
    const body = (await response.json()) as PublicationBody;
    const catalog = await readCatalog();
    const priceRevisions = await readPriceRevisions();

    // assert
    expect(response.status).toBe(201);
    expect(catalog.products).toEqual([
      expect.objectContaining({
        slug: "glute-growth-guide",
        price: PAID_PRICE,
      }),
    ]);
    expect(priceRevisions).toEqual([
      {
        eurCents: 3900,
        publicationId: body.publication.id,
        sequence: 1,
        usdCents: 4500,
      },
    ]);
  });

  it("publishes a product with a free pricing as free", async () => {
    // arrange
    // act
    const response = await suite.request(
      publicationRequest({ metadata: { pricing: FREE_PRICING } }),
    );
    const catalog = await readCatalog();

    // assert
    expect(response.status).toBe(201);
    expect(catalog.products).toEqual([
      expect.objectContaining({ slug: "glute-growth-guide", price: null }),
    ]);
    await expect(readPriceRevisions()).resolves.toEqual([]);
  });

  it.each([
    ["omitted", { pricing: undefined }],
    ["null", { pricing: null }],
    ["of an unknown kind", { pricing: { kind: "discounted" } }],
    ["free with amounts", { pricing: { ...FREE_PRICING, ...PAID_PRICE } }],
    ["replaced by the retired prices field", { prices: PAID_PRICE }],
  ])(
    "rejects a new product whose pricing is %s and writes nothing",
    async (_label, pricingFields) => {
      // arrange
      const paths = [
        "/api/management/store/products",
        "/api/management/store/product-validations",
      ];

      // act
      const responses = await Promise.all(
        paths.map((path) =>
          suite.request(
            publicationRequest({ metadata: { ...pricingFields }, path }),
          ),
        ),
      );
      const bodies = await Promise.all(
        responses.map((response) => response.json()),
      );
      const catalog = await readCatalog();

      // assert
      expect(responses.map((response) => response.status)).toEqual([400, 400]);
      expect(bodies).toEqual([
        expect.objectContaining({
          error: expect.objectContaining({ code: "invalid_request" }),
        }),
        expect.objectContaining({
          error: expect.objectContaining({ code: "invalid_request" }),
        }),
      ]);
      expect(catalog.products).toEqual([]);
      await expect(readPriceRevisions()).resolves.toEqual([]);
    },
  );

  it.each([
    ["free", FREE_PRICING],
    ["paid", PAID_PRICING],
  ])(
    "reports the resolved %s pricing in a dry run and writes nothing",
    async (_label, pricing) => {
      // arrange
      // act
      const response = await suite.request(
        publicationRequest({
          metadata: { pricing },
          path: "/api/management/store/product-validations",
        }),
      );
      const body = (await response.json()) as {
        plan: Record<string, unknown>;
      };
      const catalog = await readCatalog();

      // assert
      expect(response.status).toBe(200);
      expect(body.plan).toMatchObject({
        operation: "create_product",
        pricing,
      });
      expect(catalog.products).toEqual([]);
      await expect(readPriceRevisions()).resolves.toEqual([]);
    },
  );

  it.each([
    [
      "one amount without the other",
      { eurCents: 3900 },
      { code: "missing_price", currency: "USD" },
    ],
    [
      "zero",
      { eurCents: 0, usdCents: 4500 },
      {
        code: "price_out_of_range",
        currency: "EUR",
        minimum: 1,
        maximum: 99_999_999,
      },
    ],
    [
      "a fractional amount",
      { eurCents: 3900, usdCents: 45.5 },
      { code: "price_not_whole_minor_units", currency: "USD" },
    ],
    [
      "an amount above the ceiling",
      { eurCents: 100_000_000, usdCents: 4500 },
      {
        code: "price_out_of_range",
        currency: "EUR",
        minimum: 1,
        maximum: 99_999_999,
      },
    ],
  ])(
    "rejects %s with the price rule it breaks and writes nothing",
    async (_label, amounts, issue) => {
      // arrange
      // act
      const response = await suite.request(
        publicationRequest({
          metadata: { pricing: { kind: "paid", ...amounts } },
        }),
      );
      const catalog = await readCatalog();

      // assert
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({
        error: { code: "validation_failed", issues: [issue] },
      });
      expect(catalog.products).toEqual([]);
      await expect(readPriceRevisions()).resolves.toEqual([]);
    },
  );

  it("rejects a pricing sent on a content revision and keeps the product as it was", async () => {
    // arrange
    const published = await suite.request(publicationRequest());
    const { publication } = (await published.json()) as PublicationBody;

    // act
    const revision = await suite.request(
      publicationRequest({
        idempotencyKey: "revise-1",
        metadata: { pricing: PAID_PRICING, title: "Repriced by mistake" },
        path: `/api/management/store/products/${publication.productId}/versions`,
      }),
    );
    const catalog = await readCatalog();

    // assert
    expect(revision.status).toBe(400);
    expect(await revision.json()).toMatchObject({
      error: { code: "invalid_request" },
    });
    expect(catalog.products).toEqual([
      expect.objectContaining({ title: "Glute Growth Guide", price: null }),
    ]);
  });

  it("rejects an unknown top-level field instead of ignoring it", async () => {
    // arrange
    // act
    const response = await suite.request(
      publicationRequest({ metadata: { priceEUR: 39 } }),
    );
    const catalog = await readCatalog();

    // assert
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { code: "invalid_request" },
    });
    expect(catalog.products).toEqual([]);
  });

  it("turns a product paid and free again while its version, position and grants stay", async () => {
    // arrange
    const published = await suite.request(publicationRequest());
    const { publication } = (await published.json()) as PublicationBody;
    const acquisition = await requestAcquisition(
      "early@example.com",
      "44444444-4444-4444-8444-444444444444",
    );

    expect(acquisition.status).toBe(201);

    const [deliveredEmail] = await suite.sentEmails();
    const grantToken = downloadTokenFrom(deliveredEmail!);

    // act
    const madePaid = await suite.request(
      priceChangeRequest(publication.productId, {
        idempotencyKey: "reprice-1",
        pricing: PAID_PRICING,
      }),
    );
    const madePaidBody = (await madePaid.json()) as PublicationBody;
    const paidCatalog = await readCatalog();
    const madeFree = await suite.request(
      priceChangeRequest(publication.productId, {
        idempotencyKey: "reprice-2",
        pricing: FREE_PRICING,
      }),
    );
    const madeFreeBody = (await madeFree.json()) as PublicationBody;
    const freeCatalog = await readCatalog();
    const download = await requestDownload(grantToken);
    const [product] = await suite.postgres.queryRows<{
      displayOrder: number;
      versions: number;
    }>({
      sql: `
        select
          product.display_order as "displayOrder",
          (select count(*) from app.product_versions)::int as versions
        from app.products product
        where product.id = $1
      `,
      values: [publication.productId],
    });

    // assert
    expect(madePaid.status).toBe(201);
    expect(madePaidBody.publication).toMatchObject({
      operation: "reprice_product",
      pricing: PAID_PRICING,
      productId: publication.productId,
      productVersionId: null,
      replayed: false,
    });
    expect(paidCatalog.products).toEqual([
      expect.objectContaining({ price: PAID_PRICE }),
    ]);
    expect(madeFree.status).toBe(201);
    expect(madeFreeBody.publication).toMatchObject({
      operation: "reprice_product",
      pricing: FREE_PRICING,
      productVersionId: null,
    });
    expect(freeCatalog.products).toEqual([
      expect.objectContaining({ price: null }),
    ]);
    expect(product).toEqual({ displayOrder: 1, versions: 1 });
    await expect(readPriceRevisions()).resolves.toEqual([
      {
        eurCents: 3900,
        publicationId: madePaidBody.publication.id,
        sequence: 1,
        usdCents: 4500,
      },
      {
        eurCents: null,
        publicationId: madeFreeBody.publication.id,
        sequence: 2,
        usdCents: null,
      },
    ]);
    expect(download.status).toBe(200);
    expect(await download.text()).toBe(new TextDecoder().decode(PDF_BYTES));
  });

  it("returns the same price change when its idempotency key is replayed", async () => {
    // arrange
    const published = await suite.request(publicationRequest());
    const { publication } = (await published.json()) as PublicationBody;
    const first = await suite.request(
      priceChangeRequest(publication.productId, {
        idempotencyKey: "reprice-1",
        pricing: PAID_PRICING,
      }),
    );
    const firstBody = (await first.json()) as PublicationBody;

    // act
    const replay = await suite.request(
      priceChangeRequest(publication.productId, {
        idempotencyKey: "reprice-1",
        pricing: PAID_PRICING,
      }),
    );
    const replayBody = (await replay.json()) as PublicationBody;

    // assert
    expect(replay.status).toBe(200);
    expect(replayBody.publication).toMatchObject({
      id: firstBody.publication.id,
      pricing: PAID_PRICING,
      replayed: true,
    });
    await expect(readPriceRevisions()).resolves.toHaveLength(1);
  });

  it("rejects a price change key reused with a different payload", async () => {
    // arrange
    const published = await suite.request(publicationRequest());
    const { publication } = (await published.json()) as PublicationBody;

    await suite.request(
      priceChangeRequest(publication.productId, {
        idempotencyKey: "reprice-1",
        pricing: PAID_PRICING,
      }),
    );

    // act
    const response = await suite.request(
      priceChangeRequest(publication.productId, {
        idempotencyKey: "reprice-1",
        pricing: { kind: "paid", eurCents: 4900, usdCents: 5500 },
      }),
    );
    const catalog = await readCatalog();

    // assert
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      error: { code: "idempotency_conflict" },
    });
    expect(catalog.products).toEqual([
      expect.objectContaining({ price: PAID_PRICE }),
    ]);
  });

  it("refuses to reprice a retired product", async () => {
    // arrange
    const published = await suite.request(publicationRequest());
    const { publication } = (await published.json()) as PublicationBody;

    await suite.request(
      new Request(
        suite.url(`/api/management/store/products/${publication.productId}`),
        {
          headers: {
            authorization: managementAuthorization,
            "x-forwarded-proto": "https",
          },
          method: "PATCH",
        },
      ),
    );

    // act
    const response = await suite.request(
      priceChangeRequest(publication.productId, {
        idempotencyKey: "reprice-1",
        pricing: PAID_PRICING,
      }),
    );

    // assert
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: {
        code: "validation_failed",
        issues: [{ code: "product_retired" }],
      },
    });
    await expect(readPriceRevisions()).resolves.toEqual([]);
  });

  it.each([
    ["the same amounts", PAID_PRICING, PAID_PRICING],
    ["free to free", FREE_PRICING, FREE_PRICING],
  ])(
    "refuses %s as an unchanged price",
    async (_label, initialPricing, nextPricing) => {
      // arrange
      const published = await suite.request(
        publicationRequest({ metadata: { pricing: initialPricing } }),
      );
      const { publication } = (await published.json()) as PublicationBody;

      // act
      const response = await suite.request(
        priceChangeRequest(publication.productId, {
          idempotencyKey: "reprice-1",
          pricing: nextPricing,
        }),
      );

      // assert
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({
        error: {
          code: "validation_failed",
          issues: [{ code: "price_unchanged" }],
        },
      });
    },
  );

  it.each([
    ["omits the pricing", {}],
    ["sends a null pricing", { pricing: null }],
    ["sends an unknown kind", { pricing: { kind: "discounted" } }],
    [
      "sends amounts on a free pricing",
      { pricing: { ...FREE_PRICING, ...PAID_PRICE } },
    ],
    ["sends the retired prices field", { prices: null }],
  ])(
    "refuses a price change that %s rather than assuming free",
    async (_label, pricingFields) => {
      // arrange
      const published = await suite.request(
        publicationRequest({ metadata: { pricing: PAID_PRICING } }),
      );
      const { publication } = (await published.json()) as PublicationBody;

      // act
      const response = await suite.request(
        priceChangeRequest(publication.productId, {
          idempotencyKey: "reprice-1",
          ...pricingFields,
        }),
      );
      const catalog = await readCatalog();

      // assert
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({
        error: { code: "invalid_request" },
      });
      expect(catalog.products).toEqual([
        expect.objectContaining({ price: PAID_PRICE }),
      ]);
      await expect(readPriceRevisions()).resolves.toHaveLength(1);
    },
  );

  it("refuses an unauthenticated price change", async () => {
    // arrange
    const published = await suite.request(publicationRequest());
    const { publication } = (await published.json()) as PublicationBody;

    // act
    const response = await suite.request(
      priceChangeRequest(
        publication.productId,
        { idempotencyKey: "reprice-1", pricing: PAID_PRICING },
        "Bearer wrong-secret",
      ),
    );

    // assert
    expect(response.status).toBe(401);
    await expect(readPriceRevisions()).resolves.toEqual([]);
  });

  it("reports a price change for an unknown product as not found", async () => {
    // arrange
    // act
    const response = await suite.request(
      priceChangeRequest(4040, {
        idempotencyKey: "reprice-1",
        pricing: PAID_PRICING,
      }),
    );

    // assert
    expect(response.status).toBe(404);
  });

  it("reports an unknown product as not found", async () => {
    // arrange
    // act
    const response = await suite.request(
      new Request(suite.url("/api/management/store/products/4040"), {
        headers: {
          authorization: managementAuthorization,
          "x-forwarded-proto": "https",
        },
        method: "PATCH",
      }),
    );

    // assert
    expect(response.status).toBe(404);
  });
});

function publicationRequest(
  options: {
    coverBytes?: Uint8Array<ArrayBuffer>;
    credential?: string;
    downloadBytes?: Uint8Array<ArrayBuffer>;
    forwardedProtocol?: string;
    idempotencyKey?: string;
    metadata?: Record<string, unknown>;
    path?: string;
  } = {},
): Request {
  const formData = new FormData();
  const path = options.path ?? "/api/management/store/products";
  const isRevision = path.endsWith("/versions");
  const metadata = {
    cardSummary: "A practical guide to training the glutes with intent.",
    coverAlt: "Cover of Glute Growth Guide.",
    creatorName: "Eli Lungu",
    detailDescription:
      "Anatomy, exercise selection, session structure, and an example workout.",
    downloads: [{ field: "file0", customerFilename: "GluteGrowthGuide.pdf" }],
    goalSlugs: ["muscle-building"],
    idempotencyKey: options.idempotencyKey ?? "publish-1",
    includedItems: ["The three glute muscles and what each one does"],
    title: "Glute Growth Guide",
    typeSlugs: ["e-books"],
    ...(isRevision
      ? {}
      : { pricing: FREE_PRICING, slug: "glute-growth-guide" }),
    ...options.metadata,
  };

  formData.set("metadata", JSON.stringify(metadata));
  formData.set(
    "cover",
    new File([options.coverBytes ?? PNG_BYTES], "cover.png"),
  );
  formData.set(
    "file0",
    new File([options.downloadBytes ?? PDF_BYTES], "guide.pdf"),
  );

  return new Request(suite.url(path), {
    body: formData,
    headers: {
      authorization: options.credential ?? managementAuthorization,
      "x-forwarded-proto": options.forwardedProtocol ?? "https",
    },
    method: "POST",
  });
}

function oversizedPublicationRequest(authorization: string): Request {
  return new Request(suite.url("/api/management/store/products"), {
    body: new Uint8Array(MAX_PUBLICATION_BYTES + 1),
    headers: {
      authorization,
      "content-type": "multipart/form-data; boundary=oversized",
      "x-forwarded-proto": "https",
    },
    method: "POST",
  });
}

type CatalogBody = {
  products: {
    price: { eurCents: number; usdCents: number } | null;
    slug: string;
    title: string;
  }[];
};

async function readCatalog(): Promise<CatalogBody> {
  const response = await suite.request(
    new Request(suite.url("/api/store/catalog")),
  );

  return (await response.json()) as CatalogBody;
}

function priceChangeRequest(
  productId: number,
  body: Record<string, unknown>,
  credential = managementAuthorization,
): Request {
  return new Request(
    suite.url(`/api/management/store/products/${productId}/prices`),
    {
      body: JSON.stringify(body),
      headers: {
        authorization: credential,
        "content-type": "application/json",
        "x-forwarded-proto": "https",
      },
      method: "POST",
    },
  );
}

async function readPriceRevisions(): Promise<
  {
    eurCents: number | null;
    publicationId: number;
    sequence: number;
    usdCents: number | null;
  }[]
> {
  return suite.postgres.queryRows({
    sql: `
      select
        sequence,
        eur_cents as "eurCents",
        usd_cents as "usdCents",
        publication_id as "publicationId"
      from app.product_price_revisions
      order by sequence
    `,
    values: [],
  });
}

async function assetRootEntries(): Promise<string[]> {
  const entries = await readdir(suite.assetRoot());

  return entries.sort();
}

async function requestAcquisition(
  email: string,
  idempotencyKey: string,
): Promise<Response> {
  const formData = new FormData();

  formData.set("cf-turnstile-response", storeSubmissionToken);
  formData.set("email", email);
  formData.set("idempotencyKey", idempotencyKey);
  formData.set("marketingConsent", "false");
  formData.set("productSlugs", JSON.stringify(["glute-growth-guide"]));
  formData.set("termsAccepted", "true");

  return suite.request(
    new Request(suite.url("/api/store/acquisitions"), {
      body: formData,
      method: "POST",
    }),
  );
}

async function requestDownload(token: string): Promise<Response> {
  const formData = new FormData();

  formData.set("token", token);

  return suite.request(
    new Request(suite.url("/api/store/downloads"), {
      body: formData,
      method: "POST",
    }),
  );
}

function downloadTokenFrom(email: SentEmail): string {
  const [downloadUrl] = /https?:\/\/\S+/.exec(email.text) ?? [];

  if (!downloadUrl) {
    throw new Error("Delivery email carries no download link.");
  }

  return new URL(downloadUrl).hash.slice(1);
}
