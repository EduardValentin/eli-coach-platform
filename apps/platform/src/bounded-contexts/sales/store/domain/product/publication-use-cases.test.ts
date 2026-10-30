import { describe, expect, it, vi } from "vitest";

import { PlanNewProductUseCase } from "./plan-new-product-use-case";
import { PlanProductRevisionUseCase } from "./plan-product-revision-use-case";
import { Product } from "./product";
import type { ProductAssetWriterPort } from "./product-asset-writer-port";
import type { ProductAssetDigestPort } from "./product-asset-digest-port";
import type {
  ProductCoverInput,
  ProductDownloadInput,
  ProductVersionMetadata,
  PublishingPrincipal,
} from "./product-publication";
import { PublishNewProductUseCase } from "./publish-new-product-use-case";
import { PublishProductVersionUseCase } from "./publish-product-version-use-case";
import { RetireProductUseCase } from "./retire-product-use-case";
import type { StoreProductPublicationsPort } from "./store-product-publications-port";

const PDF_BYTES = Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);
const PNG_BYTES = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
const AGENT = {
  kind: "machine",
  id: "management-agent",
} satisfies PublishingPrincipal;

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
  types: [{ slug: "e-books", label: "E-Books", displayOrder: 3 }],
};

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

function createDigest(): ProductAssetDigestPort {
  return { sha256: (bytes) => `sha-${bytes.byteLength}` };
}

function createWriter(): ProductAssetWriterPort {
  return { write: vi.fn().mockResolvedValue(undefined) };
}

function createPublications(
  storeProductPublicationsPort: Partial<StoreProductPublicationsPort> = {},
): StoreProductPublicationsPort {
  return {
    findProductById: vi.fn().mockResolvedValue(existingProduct()),
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
    ...storeProductPublicationsPort,
  };
}

function createOptions(
  overrides: Partial<StoreProductPublicationsPort> = {},
  productAssetWriterPort: ProductAssetWriterPort = createWriter(),
) {
  const publications = createPublications(overrides);
  const planOptions = {
    productAssetDigestPort: createDigest(),
    storeProductPublicationsPort: publications,
  };

  return {
    options: { productAssetWriterPort, ...planOptions },
    planOptions,
    storeProductPublicationsPort: publications,
    productAssetWriterPort,
  };
}

const newProductCommand = {
  cover,
  downloads,
  metadata,
  slug: "glute-growth-guide",
};

const publishNewProductCommand = {
  ...newProductCommand,
  idempotencyKey: "publish-1",
  publishedBy: AGENT,
};

describe("PlanNewProductUseCase", () => {
  it("appends the planned product to the end of the catalog order", async () => {
    // arrange
    const { planOptions } = createOptions();

    // act
    const result = await new PlanNewProductUseCase(planOptions).execute(
      newProductCommand,
    );

    // assert
    expect(result.status === "valid" && result.plan).toMatchObject({
      displayOrder: 5,
      operation: "create_product",
      productId: null,
      productSlug: "glute-growth-guide",
      versionSequence: 1,
    });
  });

  it("rejects a slug already used by another product", async () => {
    // arrange
    const { planOptions } = createOptions({
      findProductBySlug: vi.fn().mockResolvedValue(existingProduct()),
    });

    // act
    const result = await new PlanNewProductUseCase(planOptions).execute(
      newProductCommand,
    );

    // assert
    expect(result).toEqual({
      status: "invalid",
      issues: [{ code: "slug_taken", slug: "glute-growth-guide" }],
    });
  });

  it("rejects a malformed slug without asking the catalog", async () => {
    // arrange
    const { planOptions, storeProductPublicationsPort } = createOptions();

    // act
    const result = await new PlanNewProductUseCase(planOptions).execute({
      ...newProductCommand,
      slug: "Glute-Growth",
    });

    // assert
    expect(result).toEqual({
      status: "invalid",
      issues: [{ code: "invalid_slug", slug: "Glute-Growth" }],
    });
    expect(
      storeProductPublicationsPort.findProductBySlug,
    ).not.toHaveBeenCalled();
  });

  it("reports unavailable when the catalog fails", async () => {
    // arrange
    const { planOptions } = createOptions({
      getTaxonomy: vi.fn().mockRejectedValue(new Error("connection lost")),
    });

    // act
    const result = await new PlanNewProductUseCase(planOptions).execute(
      newProductCommand,
    );

    // assert
    expect(result).toEqual({ status: "unavailable" });
  });
});

describe("PlanProductRevisionUseCase", () => {
  it("plans the next version while preserving the product's position", async () => {
    // arrange
    const { planOptions } = createOptions({
      findProductBySlug: vi.fn().mockResolvedValue(existingProduct()),
    });

    // act
    const result = await new PlanProductRevisionUseCase(planOptions).execute({
      cover,
      downloads,
      metadata,
      productSlug: "glute-growth-guide",
    });

    // assert
    expect(result.status === "valid" && result.plan).toMatchObject({
      displayOrder: 2,
      operation: "revise_product",
      productSlug: "glute-growth-guide",
      versionSequence: 4,
    });
  });

  it("rejects a revision of an unknown product", async () => {
    // arrange
    const { planOptions } = createOptions({
      findProductBySlug: vi.fn().mockResolvedValue(null),
    });

    // act
    const result = await new PlanProductRevisionUseCase(planOptions).execute({
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

  it("reports unavailable when the catalog fails", async () => {
    // arrange
    const { planOptions } = createOptions({
      findProductBySlug: vi
        .fn()
        .mockRejectedValue(new Error("connection lost")),
    });

    // act
    const result = await new PlanProductRevisionUseCase(planOptions).execute({
      cover,
      downloads,
      metadata,
      productSlug: "glute-growth-guide",
    });

    // assert
    expect(result).toEqual({ status: "unavailable" });
  });
});

describe("PublishNewProductUseCase", () => {
  it("writes every asset before recording the publication", async () => {
    // arrange
    const { options, storeProductPublicationsPort, productAssetWriterPort } =
      createOptions();

    // act
    const result = await new PublishNewProductUseCase(options).execute(
      publishNewProductCommand,
    );

    // assert
    expect(result).toMatchObject({
      status: "published",
      publication: { operation: "create_product", productVersionId: 91 },
    });
    expect(productAssetWriterPort.write).toHaveBeenCalledTimes(2);
    expect(
      storeProductPublicationsPort.persistPublication,
    ).toHaveBeenCalledWith(
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
    const { options, storeProductPublicationsPort, productAssetWriterPort } =
      createOptions();
    const publishNewProductUseCase = new PublishNewProductUseCase(options);
    const first = await publishNewProductUseCase.execute(
      publishNewProductCommand,
    );
    const persisted =
      storeProductPublicationsPort.persistPublication as ReturnType<
        typeof vi.fn
      >;
    const storedDigest = persisted.mock.calls[0]![0].payloadDigest;

    storeProductPublicationsPort.findPublicationByIdempotencyKey = vi
      .fn()
      .mockResolvedValue({
        payloadDigest: storedDigest,
        publication:
          first.status === "published" ? first.publication : undefined,
      });
    persisted.mockClear();
    (productAssetWriterPort.write as ReturnType<typeof vi.fn>).mockClear();

    // act
    const result = await publishNewProductUseCase.execute(
      publishNewProductCommand,
    );

    // assert
    expect(result.status).toBe("replayed");
    expect(productAssetWriterPort.write).not.toHaveBeenCalled();
    expect(persisted).not.toHaveBeenCalled();
  });

  it("rejects an idempotency key reused with a different payload", async () => {
    // arrange
    const { options, productAssetWriterPort } = createOptions({
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
    const result = await new PublishNewProductUseCase(options).execute(
      publishNewProductCommand,
    );

    // assert
    expect(result).toEqual({ status: "idempotency_conflict" });
    expect(productAssetWriterPort.write).not.toHaveBeenCalled();
  });

  it("writes nothing when validation fails", async () => {
    // arrange
    const { options, storeProductPublicationsPort, productAssetWriterPort } =
      createOptions();

    // act
    const result = await new PublishNewProductUseCase(options).execute({
      ...publishNewProductCommand,
      downloads: [],
    });

    // assert
    expect(result.status).toBe("invalid");
    expect(productAssetWriterPort.write).not.toHaveBeenCalled();
    expect(
      storeProductPublicationsPort.persistPublication,
    ).not.toHaveBeenCalled();
  });

  it("reports unavailable and persists nothing when an asset write fails", async () => {
    // arrange
    const writer = {
      write: vi.fn().mockRejectedValue(new Error("disk full")),
    } satisfies ProductAssetWriterPort;
    const { options, storeProductPublicationsPort } = createOptions({}, writer);

    // act
    const result = await new PublishNewProductUseCase(options).execute(
      publishNewProductCommand,
    );

    // assert
    expect(result).toEqual({ status: "unavailable" });
    expect(
      storeProductPublicationsPort.persistPublication,
    ).not.toHaveBeenCalled();
  });
});

describe("PublishProductVersionUseCase", () => {
  it("publishes the next version of an existing product", async () => {
    // arrange
    const { options, storeProductPublicationsPort } = createOptions();

    // act
    const result = await new PublishProductVersionUseCase(options).execute({
      cover,
      downloads,
      idempotencyKey: "revise-1",
      metadata,
      productId: 7,
      publishedBy: AGENT,
    });

    // assert
    expect(result).toMatchObject({ status: "published" });
    expect(
      storeProductPublicationsPort.persistPublication,
    ).toHaveBeenCalledWith(
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
    const { options } = createOptions({
      findProductById: vi.fn().mockResolvedValue(null),
    });

    // act
    const result = await new PublishProductVersionUseCase(options).execute({
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

  it("replays an existing publication before looking the product up", async () => {
    // arrange
    const { options, storeProductPublicationsPort } = createOptions();
    const publishProductVersionUseCase = new PublishProductVersionUseCase(
      options,
    );
    const command = {
      cover,
      downloads,
      idempotencyKey: "revise-1",
      metadata,
      productId: 7,
      publishedBy: AGENT,
    };
    const first = await publishProductVersionUseCase.execute(command);
    const persisted =
      storeProductPublicationsPort.persistPublication as ReturnType<
        typeof vi.fn
      >;

    storeProductPublicationsPort.findPublicationByIdempotencyKey = vi
      .fn()
      .mockResolvedValue({
        payloadDigest: persisted.mock.calls[0]![0].payloadDigest,
        publication:
          first.status === "published" ? first.publication : undefined,
      });
    persisted.mockClear();
    (
      storeProductPublicationsPort.findProductById as ReturnType<typeof vi.fn>
    ).mockClear();

    // act
    const result = await publishProductVersionUseCase.execute(command);

    // assert
    expect(result.status).toBe("replayed");
    expect(storeProductPublicationsPort.findProductById).not.toHaveBeenCalled();
    expect(persisted).not.toHaveBeenCalled();
  });

  it("reports unavailable when persistence fails", async () => {
    // arrange
    const { options } = createOptions({
      persistPublication: vi
        .fn()
        .mockRejectedValue(new Error("connection lost")),
    });

    // act
    const result = await new PublishProductVersionUseCase(options).execute({
      cover,
      downloads,
      idempotencyKey: "revise-1",
      metadata,
      productId: 7,
      publishedBy: AGENT,
    });

    // assert
    expect(result).toEqual({ status: "unavailable" });
  });
});

describe("RetireProductUseCase", () => {
  it("retires a published product", async () => {
    // arrange
    const storeProductPublicationsPort = createPublications();

    // act
    const result = await new RetireProductUseCase({
      storeProductPublicationsPort,
    }).execute(7);

    // assert
    expect(result).toEqual({ status: "retired", productId: 7 });
    expect(storeProductPublicationsPort.retireProduct).toHaveBeenCalledWith(7);
  });

  it("reports an unknown product as not found", async () => {
    // arrange
    const storeProductPublicationsPort = createPublications({
      retireProduct: vi.fn().mockResolvedValue(false),
    });

    // act
    const result = await new RetireProductUseCase({
      storeProductPublicationsPort,
    }).execute(404);

    // assert
    expect(result).toEqual({ status: "not_found" });
  });

  it("reports unavailable when retirement fails", async () => {
    // arrange
    const storeProductPublicationsPort = createPublications({
      retireProduct: vi.fn().mockRejectedValue(new Error("connection lost")),
    });

    // act
    const result = await new RetireProductUseCase({
      storeProductPublicationsPort,
    }).execute(7);

    // assert
    expect(result).toEqual({ status: "unavailable" });
  });
});
