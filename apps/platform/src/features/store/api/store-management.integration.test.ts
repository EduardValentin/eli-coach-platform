import { readdir } from "node:fs/promises";

import { STORE_ACQUISITION_TURNSTILE_ACTION } from "@eli-coach-platform/infrastructure/bot-detection";
import { MAX_PUBLICATION_BYTES } from "@eli-coach-platform/domain";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import {
  ApiIntegrationTestSuite,
  type SentEmail,
} from "~integration-test-config/api-integration-test-suite";
import { turnstileTokenForAction } from "~integration-test-config/wire-mock/expectations/turnstile-siteverify";

const suite = new ApiIntegrationTestSuite();
const MANAGEMENT_SECRET = "integration-management-api-secret-value";
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
    productId: number;
    productSlug: string;
    productVersionId: number;
    replayed: boolean;
  };
};

describe.sequential("Store management integration", () => {
  beforeAll(async () => {
    await suite.start();
  });

  afterEach(async () => {
    await suite.reset();
  });

  afterAll(async () => {
    await suite.stop();
  });

  it("refuses an unauthenticated publication without storing the upload", async () => {
    // arrange
    const request = publicationRequest({ credential: "Bearer wrong-secret" });

    // act
    const response = await suite.request(request);

    // assert
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({
      error: { code: "unauthorized" },
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
  });

  it("refuses an upload beyond the publication ceiling", async () => {
    // arrange
    const request = new Request(
      suite.url("/api/management/store/products"),
      {
        body: new Uint8Array(MAX_PUBLICATION_BYTES + 1),
        headers: {
          authorization: `Bearer ${MANAGEMENT_SECRET}`,
          "content-type": "multipart/form-data; boundary=oversized",
          "x-forwarded-proto": "https",
        },
        method: "POST",
      },
    );

    // act
    const response = await suite.request(request);

    // assert
    expect(response.status).toBe(413);
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
    expect(await download.text()).toBe(
      new TextDecoder().decode(PDF_BYTES),
    );
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
            authorization: `Bearer ${MANAGEMENT_SECRET}`,
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

  it("reports an unknown product as not found", async () => {
    // arrange
    // act
    const response = await suite.request(
      new Request(suite.url("/api/management/store/products/4040"), {
        headers: {
          authorization: `Bearer ${MANAGEMENT_SECRET}`,
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
    ...(isRevision ? {} : { slug: "glute-growth-guide" }),
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
      authorization: options.credential ?? `Bearer ${MANAGEMENT_SECRET}`,
      "x-forwarded-proto": options.forwardedProtocol ?? "https",
    },
    method: "POST",
  });
}

async function readCatalog(): Promise<{
  products: { slug: string; title: string }[];
}> {
  const response = await suite.request(
    new Request(suite.url("/api/store/catalog")),
  );

  return (await response.json()) as {
    products: { slug: string; title: string }[];
  };
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
