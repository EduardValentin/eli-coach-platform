import { describe, expect, it, vi } from "vitest";

import {
  MAX_PUBLICATION_BYTES,
  StoreProductPublicationService,
  type ProductAssetDigest,
  type ProductAssetWriter,
  type ProductCoverInput,
  type ProductDownloadInput,
  type ProductVersionMetadata,
  type PublishableProduct,
  type PublishingPrincipal,
  type StoreProductPublicationRepository,
} from "./index";

const PDF_BYTES = Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);
const PNG_BYTES = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
const AGENT = { kind: "machine", id: "management-agent" } satisfies PublishingPrincipal;

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

const existingProduct = {
  displayOrder: 2,
  id: 7,
  latestVersionSequence: 3,
  lifecycleStatus: "published",
  slug: "glute-growth-guide",
} satisfies PublishableProduct;

const taxonomy = {
  goals: [{ slug: "muscle-building", label: "Muscle Building", displayOrder: 1 }],
  types: [
    { slug: "e-books", label: "E-Books", displayOrder: 3 },
    { slug: "workouts", label: "Workouts", displayOrder: 1 },
  ],
};

function createDigest(): ProductAssetDigest {
  return {
    // Distinct-but-deterministic: length is enough to separate the fixtures.
    sha256: (bytes) => String(bytes.byteLength).padStart(64, "0"),
  };
}

function createWriter(): ProductAssetWriter {
  return { write: vi.fn().mockResolvedValue(undefined) };
}

function createRepository(
  overrides: Partial<StoreProductPublicationRepository> = {},
): StoreProductPublicationRepository {
  return {
    findProductById: vi.fn().mockResolvedValue(existingProduct),
    findProductBySlug: vi.fn().mockResolvedValue(null),
    findPublicationByIdempotencyKey: vi.fn().mockResolvedValue(null),
    getNextDisplayOrder: vi.fn().mockResolvedValue(5),
    getTaxonomy: vi.fn().mockResolvedValue(taxonomy),
    persistPublication: vi.fn().mockImplementation((command) =>
      Promise.resolve({
        id: 41,
        operation: command.operation,
        productId: 7,
        productSlug: command.productSlug,
        productVersionId: 91,
        publishedAt: new Date("2026-08-13T12:00:00.000Z"),
      }),
    ),
    retireProduct: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

function createService(
  overrides: Partial<StoreProductPublicationRepository> = {},
  collaborators: {
    digest?: ProductAssetDigest;
    writer?: ProductAssetWriter;
  } = {},
) {
  const repository = createRepository(overrides);
  const writer = collaborators.writer ?? createWriter();
  const service = new StoreProductPublicationService({
    assetWriter: writer,
    digest: collaborators.digest ?? createDigest(),
    repository,
  });

  return { repository, service, writer };
}

describe("StoreProductPublicationService.planNewProduct", () => {
  it("plans a content-addressed publication appended to the catalog order", async () => {
    // arrange
    const { service } = createService();

    // act
    const result = await service.planNewProduct({
      cover,
      downloads,
      metadata,
      slug: "glute-growth-guide",
    });

    // assert
    expect(result).toEqual({
      status: "valid",
      plan: {
        cover: {
          alt: "Cover of Glute Growth Guide.",
          assetKey: `covers/${"0".repeat(63)}8.png`,
          mimeType: "image/png",
          sha256: `${"0".repeat(63)}8`,
          sizeBytes: 8,
        },
        displayOrder: 5,
        downloads: [
          {
            assetKey: `products/${"0".repeat(63)}6.pdf`,
            customerFilename: "GluteGrowthGuide.pdf",
            mimeType: "application/pdf",
            sha256: `${"0".repeat(63)}6`,
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

  it("rejects a slug already used by another product", async () => {
    // arrange
    const { service } = createService({
      findProductBySlug: vi.fn().mockResolvedValue(existingProduct),
    });

    // act
    const result = await service.planNewProduct({
      cover,
      downloads,
      metadata,
      slug: "glute-growth-guide",
    });

    // assert
    expect(result).toEqual({
      status: "invalid",
      issues: [{ code: "slug_taken", slug: "glute-growth-guide" }],
    });
  });

  it.each([["Glute-Growth"], ["-leading-dash"], ["has space"], [""]])(
    "rejects the malformed slug %j",
    async (slug) => {
      // arrange
      const { service } = createService();

      // act
      const result = await service.planNewProduct({
        cover,
        downloads,
        metadata,
        slug,
      });

      // assert
      expect(result).toEqual({
        status: "invalid",
        issues: [{ code: "invalid_slug", slug }],
      });
    },
  );

  it("rejects unknown taxonomy with the accepted values", async () => {
    // arrange
    const { service } = createService();

    // act
    const result = await service.planNewProduct({
      cover,
      downloads,
      metadata: {
        ...metadata,
        goalSlugs: ["fat-loss"],
        typeSlugs: ["e-books", "meal-prep"],
      },
      slug: "glute-growth-guide",
    });

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

  it("rejects a download whose bytes contradict its extension", async () => {
    // arrange
    const { service } = createService();

    // act
    const result = await service.planNewProduct({
      cover,
      downloads: [{ bytes: PNG_BYTES, customerFilename: "guide.pdf" }],
      metadata,
      slug: "glute-growth-guide",
    });

    // assert
    expect(result).toEqual({
      status: "invalid",
      issues: [
        { code: "download_content_mismatch", customerFilename: "guide.pdf" },
      ],
    });
  });

  it("rejects an unsupported download extension with the accepted list", async () => {
    // arrange
    const { service } = createService();

    // act
    const result = await service.planNewProduct({
      cover,
      downloads: [{ bytes: PDF_BYTES, customerFilename: "guide.exe" }],
      metadata,
      slug: "glute-growth-guide",
    });

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

  it("rejects a cover that is not an accepted image", async () => {
    // arrange
    const { service } = createService();

    // act
    const result = await service.planNewProduct({
      cover: { alt: "Cover", bytes: PDF_BYTES },
      downloads,
      metadata,
      slug: "glute-growth-guide",
    });

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

  it("rejects a publication with no downloads", async () => {
    // arrange
    const { service } = createService();

    // act
    const result = await service.planNewProduct({
      cover,
      downloads: [],
      metadata,
      slug: "glute-growth-guide",
    });

    // assert
    expect(result).toEqual({
      status: "invalid",
      issues: [{ code: "missing_downloads" }],
    });
  });

  it("rejects two downloads sharing a customer filename", async () => {
    // arrange
    const { service } = createService();

    // act
    const result = await service.planNewProduct({
      cover,
      downloads: [
        { bytes: PDF_BYTES, customerFilename: "guide.pdf" },
        { bytes: PDF_BYTES.slice(0, 5), customerFilename: "guide.pdf" },
      ],
      metadata,
      slug: "glute-growth-guide",
    });

    // assert
    expect(result).toEqual({
      status: "invalid",
      issues: [
        { code: "duplicate_customer_filename", customerFilename: "guide.pdf" },
      ],
    });
  });

  it("rejects a payload above the upload ceiling", async () => {
    // arrange
    const { service } = createService();
    const oversized = new Uint8Array(MAX_PUBLICATION_BYTES);

    oversized.set(PDF_BYTES, 0);

    // act
    const result = await service.planNewProduct({
      cover,
      downloads: [{ bytes: oversized, customerFilename: "guide.pdf" }],
      metadata,
      slug: "glute-growth-guide",
    });

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

  it("reports unavailable when the repository fails", async () => {
    // arrange
    const { service } = createService({
      getTaxonomy: vi.fn().mockRejectedValue(new Error("connection lost")),
    });

    // act
    const result = await service.planNewProduct({
      cover,
      downloads,
      metadata,
      slug: "glute-growth-guide",
    });

    // assert
    expect(result).toEqual({ status: "unavailable" });
  });
});

describe("StoreProductPublicationService.planProductRevision", () => {
  it("plans the next version while preserving the product's position", async () => {
    // arrange
    const { service } = createService({
      findProductBySlug: vi.fn().mockResolvedValue(existingProduct),
    });

    // act
    const result = await service.planProductRevision({
      cover,
      downloads,
      metadata,
      productSlug: "glute-growth-guide",
    });

    // assert
    expect(result.status).toBe("valid");
    expect(result.status === "valid" && result.plan).toMatchObject({
      displayOrder: 2,
      operation: "revise_product",
      productSlug: "glute-growth-guide",
      versionSequence: 4,
    });
  });

  it("rejects a revision of an unknown product", async () => {
    // arrange
    const { service } = createService({
      findProductBySlug: vi.fn().mockResolvedValue(null),
    });

    // act
    const result = await service.planProductRevision({
      cover,
      downloads,
      metadata,
      productSlug: "missing",
    });

    // assert
    expect(result).toEqual({
      status: "invalid",
      issues: [{ code: "product_not_found" }],
    });
  });

  it("rejects a revision of a retired product", async () => {
    // arrange
    const { service } = createService({
      findProductBySlug: vi
        .fn()
        .mockResolvedValue({ ...existingProduct, lifecycleStatus: "archived" }),
    });

    // act
    const result = await service.planProductRevision({
      cover,
      downloads,
      metadata,
      productSlug: "glute-growth-guide",
    });

    // assert
    expect(result).toEqual({
      status: "invalid",
      issues: [{ code: "product_retired" }],
    });
  });
});

describe("StoreProductPublicationService.publishNewProduct", () => {
  it("writes every asset before recording the publication", async () => {
    // arrange
    const { repository, service, writer } = createService();

    // act
    const result = await service.publishNewProduct({
      cover,
      downloads,
      idempotencyKey: "publish-1",
      metadata,
      publishedBy: AGENT,
      slug: "glute-growth-guide",
    });

    // assert
    expect(result).toMatchObject({
      status: "published",
      publication: { operation: "create_product", productVersionId: 91 },
    });
    expect(writer.write).toHaveBeenCalledTimes(2);
    expect(repository.persistPublication).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: "publish-1",
        operation: "create_product",
        productId: null,
        publishedBy: AGENT,
        versionSequence: 1,
      }),
    );
  });

  it("replays an existing publication without writing or persisting again", async () => {
    // arrange
    const { repository, service, writer } = createService();
    const first = await service.publishNewProduct({
      cover,
      downloads,
      idempotencyKey: "publish-1",
      metadata,
      publishedBy: AGENT,
      slug: "glute-growth-guide",
    });
    const persisted = repository.persistPublication as ReturnType<typeof vi.fn>;
    const storedDigest = persisted.mock.calls[0]![0].payloadDigest;

    repository.findPublicationByIdempotencyKey = vi.fn().mockResolvedValue({
      payloadDigest: storedDigest,
      publication:
        first.status === "published" ? first.publication : undefined,
    });
    persisted.mockClear();
    (writer.write as ReturnType<typeof vi.fn>).mockClear();

    // act
    const result = await service.publishNewProduct({
      cover,
      downloads,
      idempotencyKey: "publish-1",
      metadata,
      publishedBy: AGENT,
      slug: "glute-growth-guide",
    });

    // assert
    expect(result.status).toBe("replayed");
    expect(writer.write).not.toHaveBeenCalled();
    expect(persisted).not.toHaveBeenCalled();
  });

  it("rejects an idempotency key reused with a different payload", async () => {
    // arrange
    const { service, writer } = createService({
      findPublicationByIdempotencyKey: vi.fn().mockResolvedValue({
        payloadDigest: "a".repeat(64),
        publication: {
          id: 41,
          operation: "create_product",
          productId: 7,
          productSlug: "glute-growth-guide",
          productVersionId: 91,
          publishedAt: new Date("2026-08-13T12:00:00.000Z"),
        },
      }),
    });

    // act
    const result = await service.publishNewProduct({
      cover,
      downloads,
      idempotencyKey: "publish-1",
      metadata,
      publishedBy: AGENT,
      slug: "glute-growth-guide",
    });

    // assert
    expect(result).toEqual({ status: "idempotency_conflict" });
    expect(writer.write).not.toHaveBeenCalled();
  });

  it("writes nothing when validation fails", async () => {
    // arrange
    const { repository, service, writer } = createService();

    // act
    const result = await service.publishNewProduct({
      cover,
      downloads: [],
      idempotencyKey: "publish-1",
      metadata,
      publishedBy: AGENT,
      slug: "glute-growth-guide",
    });

    // assert
    expect(result.status).toBe("invalid");
    expect(writer.write).not.toHaveBeenCalled();
    expect(repository.persistPublication).not.toHaveBeenCalled();
  });

  it("reports unavailable and persists nothing when an asset write fails", async () => {
    // arrange
    const writer = {
      write: vi.fn().mockRejectedValue(new Error("disk full")),
    } satisfies ProductAssetWriter;
    const { repository, service } = createService({}, { writer });

    // act
    const result = await service.publishNewProduct({
      cover,
      downloads,
      idempotencyKey: "publish-1",
      metadata,
      publishedBy: AGENT,
      slug: "glute-growth-guide",
    });

    // assert
    expect(result).toEqual({ status: "unavailable" });
    expect(repository.persistPublication).not.toHaveBeenCalled();
  });
});

describe("StoreProductPublicationService.publishProductVersion", () => {
  it("publishes the next version of an existing product", async () => {
    // arrange
    const { repository, service } = createService();

    // act
    const result = await service.publishProductVersion({
      cover,
      downloads,
      idempotencyKey: "revise-1",
      metadata,
      productId: 7,
      publishedBy: AGENT,
    });

    // assert
    expect(result).toMatchObject({ status: "published" });
    expect(repository.persistPublication).toHaveBeenCalledWith(
      expect.objectContaining({
        displayOrder: 2,
        operation: "revise_product",
        productId: 7,
        versionSequence: 4,
      }),
    );
  });

  it("rejects a revision of an unknown product", async () => {
    // arrange
    const { service } = createService({
      findProductById: vi.fn().mockResolvedValue(null),
    });

    // act
    const result = await service.publishProductVersion({
      cover,
      downloads,
      idempotencyKey: "revise-1",
      metadata,
      productId: 404,
      publishedBy: AGENT,
    });

    // assert
    expect(result).toEqual({
      status: "invalid",
      issues: [{ code: "product_not_found" }],
    });
  });
});

describe("StoreProductPublicationService.retireProduct", () => {
  it("retires a published product", async () => {
    // arrange
    const { repository, service } = createService();

    // act
    const result = await service.retireProduct(7);

    // assert
    expect(result).toEqual({ status: "retired", productId: 7 });
    expect(repository.retireProduct).toHaveBeenCalledWith(7);
  });

  it("reports an unknown product as not found", async () => {
    // arrange
    const { service } = createService({
      retireProduct: vi.fn().mockResolvedValue(false),
    });

    // act
    const result = await service.retireProduct(404);

    // assert
    expect(result).toEqual({ status: "not_found" });
  });

  it("reports unavailable when retirement fails", async () => {
    // arrange
    const { service } = createService({
      retireProduct: vi.fn().mockRejectedValue(new Error("connection lost")),
    });

    // act
    const result = await service.retireProduct(7);

    // assert
    expect(result).toEqual({ status: "unavailable" });
  });
});
