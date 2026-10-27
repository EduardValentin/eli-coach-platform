import { describe, expect, it } from "vitest";

import { Product, type PublicationPlacement } from "./product";
import type { ProductAssetDigest } from "./product-assets";
import {
  MAX_PUBLICATION_BYTES,
  ProductPublicationDraft,
  resolvePublicationTarget,
  validateSlugFormat,
  type ProductCoverInput,
  type ProductDownloadInput,
  type ProductVersionMetadata,
  type StoreTaxonomySnapshot,
} from "./product-publication";

const PDF_BYTES = Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);
const PNG_BYTES = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

const metadata = {
  cardSummary: "A practical guide to glute training.",
  creatorName: "Eli Lungu",
  detailDescription: "Anatomy, exercise selection, and an example workout.",
  goalSlugs: ["muscle-building"],
  includedItems: ["The three glute muscles and what each one does"],
  title: "Glute Growth Guide",
  typeSlugs: ["e-books"],
} satisfies ProductVersionMetadata;

const cover = {
  alt: "Cover of Glute Growth Guide.",
  bytes: PNG_BYTES,
} satisfies ProductCoverInput;

const downloads = [
  { bytes: PDF_BYTES, customerFilename: "GluteGrowthGuide.pdf" },
] satisfies readonly ProductDownloadInput[];

const taxonomy = {
  goals: [
    { slug: "muscle-building", label: "Muscle Building", displayOrder: 1 },
  ],
  types: [
    { slug: "e-books", label: "E-Books", displayOrder: 3 },
    { slug: "workouts", label: "Workouts", displayOrder: 1 },
  ],
} satisfies StoreTaxonomySnapshot;

const placement = {
  displayOrder: 5,
  operation: "create_product",
  productId: null,
  productSlug: "glute-growth-guide",
  versionSequence: 1,
} satisfies PublicationPlacement;

function existingProduct(
  lifecycleStatus: "archived" | "draft" | "published" = "published",
): Product {
  return Product.reconstitute({
    displayOrder: 2,
    id: 7,
    latestVersionSequence: 3,
    lifecycleStatus,
    slug: "glute-growth-guide",
  });
}

const digest: ProductAssetDigest = {
  sha256: (bytes) => `sha-${bytes.byteLength}`,
};

function draftOf(
  overrides: Partial<{
    cover: ProductCoverInput;
    downloads: readonly ProductDownloadInput[];
    metadata: ProductVersionMetadata;
  }> = {},
): ProductPublicationDraft {
  return ProductPublicationDraft.from({
    cover,
    downloads,
    metadata,
    ...overrides,
  });
}

describe("validateSlugFormat", () => {
  it.each([
    ["guide-1", null],
    ["Guide", { code: "invalid_slug", slug: "Guide" }],
    ["-leading-dash", { code: "invalid_slug", slug: "-leading-dash" }],
    ["has space", { code: "invalid_slug", slug: "has space" }],
    ["", { code: "invalid_slug", slug: "" }],
  ])("evaluates %j", (slug, expected) => {
    // arrange

    // act
    const issue = validateSlugFormat(slug);

    // assert
    expect(issue).toEqual(expected);
  });
});

describe("resolvePublicationTarget", () => {
  it.each([
    [
      { targetProductSlug: "guide", slug: "unused" },
      { kind: "revision", targetProductSlug: "guide" },
    ],
    [{ slug: "guide" }, { kind: "new", slug: "guide" }],
    [{}, null],
  ])("resolves %o", (metadataFields, expected) => {
    // arrange

    // act
    const target = resolvePublicationTarget(metadataFields);

    // assert
    expect(target).toEqual(expected);
  });
});

describe("ProductPublicationDraft.plan", () => {
  it("plans a content-addressed publication at the given placement", () => {
    // arrange
    const draft = draftOf();

    // act
    const result = draft.plan(placement, taxonomy, digest);

    // assert
    expect(result).toEqual({
      status: "valid",
      plan: {
        cover: {
          alt: "Cover of Glute Growth Guide.",
          assetKey: "covers/sha-8.png",
          mimeType: "image/png",
          sha256: "sha-8",
          sizeBytes: 8,
        },
        displayOrder: 5,
        downloads: [
          {
            assetKey: "products/sha-6.pdf",
            customerFilename: "GluteGrowthGuide.pdf",
            mimeType: "application/pdf",
            sha256: "sha-6",
            sizeBytes: 6,
          },
        ],
        goals: [taxonomy.goals[0]],
        metadata,
        operation: "create_product",
        productId: null,
        productSlug: "glute-growth-guide",
        totalUploadBytes: 14,
        types: [taxonomy.types[0]],
        versionSequence: 1,
      },
    });
  });

  it("keeps requested taxonomy in request order rather than catalog order", () => {
    // arrange
    const draft = draftOf({
      metadata: { ...metadata, typeSlugs: ["workouts", "e-books"] },
    });

    // act
    const result = draft.plan(placement, taxonomy, digest);

    // assert
    expect(result.status === "valid" && result.plan.types).toEqual([
      taxonomy.types[1],
      taxonomy.types[0],
    ]);
  });

  it("rejects unknown taxonomy with the accepted values", () => {
    // arrange
    const draft = draftOf({
      metadata: {
        ...metadata,
        goalSlugs: ["fat-loss"],
        typeSlugs: ["e-books", "meal-prep"],
      },
    });

    // act
    const result = draft.plan(placement, taxonomy, digest);

    // assert
    expect(result).toEqual({
      status: "invalid",
      issues: [
        {
          code: "unknown_type",
          slug: "meal-prep",
          acceptedSlugs: ["e-books", "workouts"],
        },
        {
          code: "unknown_goal",
          slug: "fat-loss",
          acceptedSlugs: ["muscle-building"],
        },
      ],
    });
  });

  it("rejects a download whose bytes contradict its extension", () => {
    // arrange
    const draft = draftOf({
      downloads: [{ bytes: PNG_BYTES, customerFilename: "guide.pdf" }],
    });

    // act
    const result = draft.plan(placement, taxonomy, digest);

    // assert
    expect(result).toEqual({
      status: "invalid",
      issues: [
        { code: "download_content_mismatch", customerFilename: "guide.pdf" },
      ],
    });
  });

  it("rejects an unsupported download extension with the accepted list", () => {
    // arrange
    const draft = draftOf({
      downloads: [{ bytes: PDF_BYTES, customerFilename: "guide.exe" }],
    });

    // act
    const result = draft.plan(placement, taxonomy, digest);

    // assert
    expect(result).toEqual({
      status: "invalid",
      issues: [
        {
          code: "unsupported_download_extension",
          customerFilename: "guide.exe",
          acceptedExtensions: [
            "pdf",
            "epub",
            "zip",
            "xlsx",
            "xlsm",
            "xls",
            "md",
            "csv",
          ],
        },
      ],
    });
  });

  it("rejects a cover that is not an accepted image", () => {
    // arrange
    const draft = draftOf({ cover: { alt: "Cover", bytes: PDF_BYTES } });

    // act
    const result = draft.plan(placement, taxonomy, digest);

    // assert
    expect(result).toEqual({
      status: "invalid",
      issues: [
        {
          code: "unsupported_cover_content",
          acceptedExtensions: ["jpg", "png", "webp", "avif"],
        },
      ],
    });
  });

  it("rejects a publication with no downloads", () => {
    // arrange
    const draft = draftOf({ downloads: [] });

    // act
    const result = draft.plan(placement, taxonomy, digest);

    // assert
    expect(result).toEqual({
      status: "invalid",
      issues: [{ code: "missing_downloads" }],
    });
  });

  it("rejects two downloads sharing a customer filename", () => {
    // arrange
    const draft = draftOf({
      downloads: [
        { bytes: PDF_BYTES, customerFilename: "guide.pdf" },
        { bytes: PDF_BYTES.slice(0, 5), customerFilename: "guide.pdf" },
      ],
    });

    // act
    const result = draft.plan(placement, taxonomy, digest);

    // assert
    expect(result).toEqual({
      status: "invalid",
      issues: [
        { code: "duplicate_customer_filename", customerFilename: "guide.pdf" },
      ],
    });
  });

  it("rejects a payload above the upload ceiling", () => {
    // arrange
    const oversized = new Uint8Array(MAX_PUBLICATION_BYTES);

    oversized.set(PDF_BYTES, 0);

    const draft = draftOf({
      downloads: [{ bytes: oversized, customerFilename: "guide.pdf" }],
    });

    // act
    const result = draft.plan(placement, taxonomy, digest);

    // assert
    expect(result).toEqual({
      status: "invalid",
      issues: [
        {
          code: "payload_too_large",
          maxBytes: MAX_PUBLICATION_BYTES,
          totalBytes: MAX_PUBLICATION_BYTES + PNG_BYTES.byteLength,
        },
      ],
    });
  });

  it("accepts a payload exactly at the upload ceiling", () => {
    // arrange
    const atCeiling = new Uint8Array(
      MAX_PUBLICATION_BYTES - PNG_BYTES.byteLength,
    );

    atCeiling.set(PDF_BYTES, 0);

    const draft = draftOf({
      downloads: [{ bytes: atCeiling, customerFilename: "guide.pdf" }],
    });

    // act
    const result = draft.plan(placement, taxonomy, digest);

    // assert
    expect(result.status).toBe("valid");
  });
});

describe("ProductPublicationDraft.requestDigest", () => {
  it("is stable for equal input", () => {
    // arrange
    const draft = draftOf();

    // act
    const first = draft.requestDigest(
      "create_product",
      "glute-growth-guide",
      digest,
    );
    const second = draftOf().requestDigest(
      "create_product",
      "glute-growth-guide",
      digest,
    );

    // assert
    expect(first).toBe(second);
  });

  it("changes when a download filename changes", () => {
    // arrange
    const renamed = draftOf({
      downloads: [{ bytes: PDF_BYTES, customerFilename: "workbook.pdf" }],
    });

    // act
    const original = draftOf().requestDigest(
      "create_product",
      "glute-growth-guide",
      digest,
    );
    const changed = renamed.requestDigest(
      "create_product",
      "glute-growth-guide",
      digest,
    );

    // assert
    expect(changed).not.toBe(original);
  });

  it("changes when the publication targets another product", () => {
    // arrange
    const draft = draftOf();

    // act
    const original = draft.requestDigest("create_product", "guide", digest);
    const retargeted = draft.requestDigest(
      "create_product",
      "glute-growth-guide",
      digest,
    );

    // assert
    expect(retargeted).not.toBe(original);
  });
});

describe("ProductPublicationDraft.settle", () => {
  const publication = {
    id: 41,
    operation: "create_product" as const,
    productId: 7,
    productSlug: "glute-growth-guide",
    productVersionId: 91,
    publishedAt: new Date("2026-08-13T12:00:00.000Z"),
  };

  it("replays a stored publication recorded for the same payload", () => {
    // arrange
    const draft = draftOf();

    // act
    const settled = draft.settle(
      { payloadDigest: "digest-1", publication },
      "digest-1",
    );

    // assert
    expect(settled).toEqual({ status: "replayed", publication });
  });

  it("reports a key reused with a different payload as a conflict", () => {
    // arrange
    const draft = draftOf();

    // act
    const settled = draft.settle(
      { payloadDigest: "digest-1", publication },
      "digest-2",
    );

    // assert
    expect(settled).toEqual({ status: "idempotency_conflict" });
  });

  it("leaves an unseen key unsettled", () => {
    // arrange
    const draft = draftOf();

    // act
    const settled = draft.settle(null, "digest-1");

    // assert
    expect(settled).toBeNull();
  });
});

describe("ProductPublicationDraft.planCreation", () => {
  it("plans a first version at the position the catalog offers", () => {
    // arrange
    const draft = draftOf();

    // act
    const result = draft.planCreation(
      {
        displayOrder: 9,
        existingProduct: null,
        slug: "glute-growth-guide",
      },
      taxonomy,
      digest,
    );

    // assert
    expect(result.status === "valid" && result.plan).toMatchObject({
      displayOrder: 9,
      operation: "create_product",
      productId: null,
      productSlug: "glute-growth-guide",
      versionSequence: 1,
    });
  });

  it("rejects a malformed slug", () => {
    // arrange
    const draft = draftOf();

    // act
    const result = draft.planCreation(
      { displayOrder: 9, existingProduct: null, slug: "Glute-Growth" },
      taxonomy,
      digest,
    );

    // assert
    expect(result).toEqual({
      status: "invalid",
      issues: [{ code: "invalid_slug", slug: "Glute-Growth" }],
    });
  });

  it("rejects a slug already used by another product", () => {
    // arrange
    const draft = draftOf();

    // act
    const result = draft.planCreation(
      {
        displayOrder: 9,
        existingProduct: existingProduct(),
        slug: "glute-growth-guide",
      },
      taxonomy,
      digest,
    );

    // assert
    expect(result).toEqual({
      status: "invalid",
      issues: [{ code: "slug_taken", slug: "glute-growth-guide" }],
    });
  });
});

describe("ProductPublicationDraft.planRevision", () => {
  it("plans the next version where the product already sits", () => {
    // arrange
    const draft = draftOf();

    // act
    const result = draft.planRevision(existingProduct(), taxonomy, digest);

    // assert
    expect(result.status === "valid" && result.plan).toMatchObject({
      displayOrder: 2,
      operation: "revise_product",
      productId: 7,
      productSlug: "glute-growth-guide",
      versionSequence: 4,
    });
  });

  it("rejects a revision of an unknown product", () => {
    // arrange
    const draft = draftOf();

    // act
    const result = draft.planRevision(null, taxonomy, digest);

    // assert
    expect(result).toEqual({
      status: "invalid",
      issues: [{ code: "product_not_found" }],
    });
  });

  it("rejects a revision of a retired product", () => {
    // arrange
    const draft = draftOf();

    // act
    const result = draft.planRevision(
      existingProduct("archived"),
      taxonomy,
      digest,
    );

    // assert
    expect(result).toEqual({
      status: "invalid",
      issues: [{ code: "product_retired" }],
    });
  });
});

describe("ProductPublicationDraft.persistCommand", () => {
  it("carries the plan and the request identity into the port command", () => {
    // arrange
    const draft = draftOf();
    const result = draft.plan(placement, taxonomy, digest);
    const plan = result.status === "valid" ? result.plan : null;

    // act
    const command = draft.persistCommand(plan!, {
      idempotencyKey: "publish-1",
      payloadDigest: "digest-1",
      publishedBy: { kind: "machine", id: "management-agent" },
    });

    // assert
    expect(command).toEqual({
      cover: plan!.cover,
      displayOrder: 5,
      downloads: plan!.downloads,
      goalSlugs: ["muscle-building"],
      idempotencyKey: "publish-1",
      metadata,
      operation: "create_product",
      payloadDigest: "digest-1",
      productId: null,
      productSlug: "glute-growth-guide",
      publishedBy: { kind: "machine", id: "management-agent" },
      typeSlugs: ["e-books"],
      versionSequence: 1,
    });
  });
});

describe("ProductPublicationDraft.plannedAssetContents", () => {
  it("pairs the cover and every planned download with its source bytes", () => {
    // arrange
    const secondDownloadBytes = Uint8Array.from([...PDF_BYTES, 0x0a]);
    const draft = draftOf({
      downloads: [
        { bytes: PDF_BYTES, customerFilename: "GluteGrowthGuide.pdf" },
        { bytes: secondDownloadBytes, customerFilename: "Workbook.pdf" },
      ],
    });
    const result = draft.plan(placement, taxonomy, digest);

    // act
    const contents =
      result.status === "valid"
        ? draft.plannedAssetContents(result.plan)
        : null;

    // assert
    expect(contents).toEqual([
      { assetKey: "covers/sha-8.png", bytes: PNG_BYTES },
      { assetKey: "products/sha-6.pdf", bytes: PDF_BYTES },
      { assetKey: "products/sha-7.pdf", bytes: secondDownloadBytes },
    ]);
  });
});
