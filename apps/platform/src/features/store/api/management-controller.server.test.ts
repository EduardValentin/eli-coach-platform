import {
  MAX_PUBLICATION_BYTES,
  type StoreProductPublicationService,
} from "@eli-coach-platform/domain";
import type {
  ManagementAuthConfig,
  ManagementAuthenticationResult,
  ManagementAuthenticator,
} from "@eli-coach-platform/infrastructure/management-auth/server";
import { describe, expect, it, vi } from "vitest";

import { StoreProductManagementController } from "./management-controller.server";

const PNG_BYTES = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
const PDF_BYTES = Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);
const PRINCIPAL = { kind: "machine", id: "management-api-agent" } as const;

const metadata = {
  cardSummary: "A practical guide to glute training.",
  coverAlt: "Cover of Glute Growth Guide.",
  creatorName: "Eli Lungu",
  detailDescription: "Anatomy, exercise selection, and an example workout.",
  downloads: [{ field: "file0", customerFilename: "GluteGrowthGuide.pdf" }],
  goalSlugs: ["muscle-building"],
  idempotencyKey: "publish-1",
  includedItems: ["The three glute muscles"],
  slug: "glute-growth-guide",
  title: "Glute Growth Guide",
  typeSlugs: ["e-books"],
};

const publication = {
  id: 41,
  operation: "create_product" as const,
  productId: 7,
  productSlug: "glute-growth-guide",
  productVersionId: 91,
  publishedAt: new Date("2026-08-13T12:00:00.000Z"),
};

function createAuthenticator(
  result: ManagementAuthenticationResult = {
    status: "authenticated",
    principal: PRINCIPAL,
  },
): ManagementAuthenticator {
  return { authenticate: vi.fn().mockResolvedValue(result) };
}

function createService(
  overrides: Partial<Record<keyof StoreProductPublicationService, unknown>> = {},
): StoreProductPublicationService {
  return {
    planNewProduct: vi.fn().mockResolvedValue({ status: "valid", plan: {} }),
    planProductRevision: vi
      .fn()
      .mockResolvedValue({ status: "valid", plan: {} }),
    publishNewProduct: vi
      .fn()
      .mockResolvedValue({ status: "published", publication }),
    publishProductVersion: vi
      .fn()
      .mockResolvedValue({ status: "published", publication }),
    retireProduct: vi.fn().mockResolvedValue({ status: "retired", productId: 7 }),
    ...overrides,
  } as unknown as StoreProductPublicationService;
}

function createController(options: {
  authenticator?: ManagementAuthenticator;
  service?: StoreProductPublicationService;
  transportPolicy?: ManagementAuthConfig["transportPolicy"];
}): StoreProductManagementController {
  return new StoreProductManagementController({
    authConfig: {
      principalId: PRINCIPAL.id,
      secret: "a-management-secret-of-sufficient-length",
      transportPolicy: options.transportPolicy ?? "any",
    },
    authenticator: options.authenticator ?? createAuthenticator(),
    publicationService: options.service ?? createService(),
  });
}

function publicationRequest(
  overrides: { metadata?: unknown; url?: string } = {},
): Request {
  const formData = new FormData();

  formData.set(
    "metadata",
    typeof overrides.metadata === "string"
      ? overrides.metadata
      : JSON.stringify(overrides.metadata ?? metadata),
  );
  formData.set("cover", new File([PNG_BYTES], "cover.png"));
  formData.set("file0", new File([PDF_BYTES], "guide.pdf"));

  return new Request(
    overrides.url ?? "https://example.test/api/management/store/products",
    { body: formData, method: "POST" },
  );
}

describe("StoreProductManagementController authorization", () => {
  it.each([
    ["unauthenticated", { status: "unauthenticated" }, 401, "unauthorized"],
    ["forbidden", { status: "forbidden" }, 403, "forbidden"],
    ["unavailable", { status: "unavailable" }, 503, "auth_unavailable"],
  ])(
    "maps %s to its own status without consuming the upload",
    async (_label, authResult, status, code) => {
      // arrange
      const controller = createController({
        authenticator: createAuthenticator(
          authResult as ManagementAuthenticationResult,
        ),
      });
      const request = publicationRequest();

      // act
      const response = await controller.publishProduct(request);

      // assert
      expect(response.status).toBe(status);
      expect(await response.json()).toMatchObject({
        success: false,
        error: { code },
      });
      expect(request.bodyUsed).toBe(false);
    },
  );

  it("refuses plaintext transport before authenticating at all", async () => {
    // arrange
    const authenticator = createAuthenticator();
    const controller = createController({
      authenticator,
      transportPolicy: "https_required",
    });

    // act
    const response = await controller.publishProduct(
      publicationRequest({
        url: "http://example.test/api/management/store/products",
      }),
    );

    // assert
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      error: { code: "insecure_transport" },
    });
    expect(authenticator.authenticate).not.toHaveBeenCalled();
  });

  it("accepts a proxied HTTPS request when the edge forwards the protocol", async () => {
    // arrange
    const controller = createController({ transportPolicy: "https_required" });
    const request = new Request(
      "http://example.test/api/management/store/products",
      {
        body: (() => {
          const formData = new FormData();

          formData.set("metadata", JSON.stringify(metadata));
          formData.set("cover", new File([PNG_BYTES], "cover.png"));
          formData.set("file0", new File([PDF_BYTES], "guide.pdf"));

          return formData;
        })(),
        headers: { "x-forwarded-proto": "https" },
        method: "POST",
      },
    );

    // act
    const response = await controller.publishProduct(request);

    // assert
    expect(response.status).toBe(201);
  });
});

describe("StoreProductManagementController payload handling", () => {
  it("rejects an upload beyond the publication ceiling", async () => {
    // arrange
    const controller = createController({});
    const request = new Request(
      "https://example.test/api/management/store/products",
      {
        body: new Uint8Array(MAX_PUBLICATION_BYTES + 1),
        headers: { "content-type": "multipart/form-data; boundary=oversized" },
        method: "POST",
      },
    );

    // act
    const response = await controller.publishProduct(request);

    // assert
    expect(response.status).toBe(413);
    expect(await response.json()).toMatchObject({
      error: { code: "payload_too_large" },
    });
  });

  it("rejects metadata that is not valid JSON", async () => {
    // arrange
    const controller = createController({});

    // act
    const response = await controller.publishProduct(
      publicationRequest({ metadata: "{not json" }),
    );

    // assert
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { code: "invalid_request" },
    });
  });

  it("rejects metadata that does not match the publication schema", async () => {
    // arrange
    const controller = createController({});

    // act
    const response = await controller.publishProduct(
      publicationRequest({ metadata: { ...metadata, typeSlugs: [] } }),
    );

    // assert
    expect(response.status).toBe(400);
  });

  it("rejects a customer filename carrying a path separator", async () => {
    // arrange
    const controller = createController({});

    // act
    const response = await controller.publishProduct(
      publicationRequest({
        metadata: {
          ...metadata,
          downloads: [
            { field: "file0", customerFilename: "../../escaped.pdf" },
          ],
        },
      }),
    );

    // assert
    expect(response.status).toBe(400);
  });

  it("rejects a descriptor whose named file is absent", async () => {
    // arrange
    const controller = createController({});

    // act
    const response = await controller.publishProduct(
      publicationRequest({
        metadata: {
          ...metadata,
          downloads: [{ field: "missing", customerFilename: "guide.pdf" }],
        },
      }),
    );

    // assert
    expect(response.status).toBe(400);
  });
});

describe("StoreProductManagementController outcomes", () => {
  it("returns 201 for a new publication and 200 for a replay", async () => {
    // arrange
    const controller = createController({});
    const replayController = createController({
      service: createService({
        publishNewProduct: vi
          .fn()
          .mockResolvedValue({ status: "replayed", publication }),
      }),
    });

    // act
    const created = await controller.publishProduct(publicationRequest());
    const replayed = await replayController.publishProduct(
      publicationRequest(),
    );

    // assert
    expect(created.status).toBe(201);
    expect(await created.json()).toMatchObject({
      publication: { replayed: false },
    });
    expect(replayed.status).toBe(200);
    expect(await replayed.json()).toMatchObject({
      publication: { replayed: true },
    });
  });

  it("reports a reused idempotency key with a different payload as a conflict", async () => {
    // arrange
    const controller = createController({
      service: createService({
        publishNewProduct: vi
          .fn()
          .mockResolvedValue({ status: "idempotency_conflict" }),
      }),
    });

    // act
    const response = await controller.publishProduct(publicationRequest());

    // assert
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      error: { code: "idempotency_conflict" },
    });
  });

  it("returns the domain issues behind a rejected payload", async () => {
    // arrange
    const controller = createController({
      service: createService({
        publishNewProduct: vi.fn().mockResolvedValue({
          status: "invalid",
          issues: [
            {
              code: "unknown_type",
              slug: "meal-prep",
              acceptedSlugs: ["e-books"],
            },
          ],
        }),
      }),
    });

    // act
    const response = await controller.publishProduct(publicationRequest());

    // assert
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: {
        code: "validation_failed",
        issues: [{ code: "unknown_type", acceptedSlugs: ["e-books"] }],
      },
    });
  });

  it("maps a missing product to 404 rather than a validation failure", async () => {
    // arrange
    const controller = createController({
      service: createService({
        publishProductVersion: vi.fn().mockResolvedValue({
          status: "invalid",
          issues: [{ code: "product_not_found" }],
        }),
      }),
    });

    // act
    const response = await controller.publishProductVersion(
      publicationRequest(),
      "404",
    );

    // assert
    expect(response.status).toBe(404);
  });

  it.each([["abc"], ["0"], ["-1"], [undefined]])(
    "rejects the product id %j as unknown",
    async (productId) => {
      // arrange
      const controller = createController({});

      // act
      const response = await controller.retireProduct(
        new Request("https://example.test/api/management/store/products/x", {
          method: "PATCH",
        }),
        productId,
      );

      // assert
      expect(response.status).toBe(404);
    },
  );

  it("retires a product", async () => {
    // arrange
    const controller = createController({});

    // act
    const response = await controller.retireProduct(
      new Request("https://example.test/api/management/store/products/7", {
        method: "PATCH",
      }),
      "7",
    );

    // assert
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      product: { id: 7, lifecycleStatus: "archived" },
    });
  });

  it("reports infrastructure failure as unavailable rather than a business outcome", async () => {
    // arrange
    const controller = createController({
      service: createService({
        retireProduct: vi.fn().mockResolvedValue({ status: "unavailable" }),
      }),
    });

    // act
    const response = await controller.retireProduct(
      new Request("https://example.test/api/management/store/products/7", {
        method: "PATCH",
      }),
      "7",
    );

    // assert
    expect(response.status).toBe(503);
  });

  it("requires the dry run to name either a new slug or a revision target", async () => {
    // arrange
    const controller = createController({});
    const { slug: _slug, idempotencyKey: _key, ...withoutTarget } = metadata;

    // act
    const response = await controller.validate(
      publicationRequest({ metadata: withoutTarget }),
    );

    // assert
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { code: "invalid_request" },
    });
  });

  it("rejects a dry run naming both a new slug and a revision target", async () => {
    // arrange
    const service = createService();
    const controller = createController({ service });
    const { idempotencyKey: _key, ...base } = metadata;

    // act
    const response = await controller.validate(
      publicationRequest({
        metadata: { ...base, targetProductSlug: "glute-growth-guide" },
      }),
    );

    // assert
    expect(response.status).toBe(400);
    expect(service.planNewProduct).not.toHaveBeenCalled();
    expect(service.planProductRevision).not.toHaveBeenCalled();
  });

  it("routes a dry run naming a target product to the revision plan", async () => {
    // arrange
    const service = createService();
    const controller = createController({ service });
    const { slug: _slug, idempotencyKey: _key, ...base } = metadata;

    // act
    await controller.validate(
      publicationRequest({
        metadata: { ...base, targetProductSlug: "glute-growth-guide" },
      }),
    );

    // assert
    expect(service.planProductRevision).toHaveBeenCalledWith(
      expect.objectContaining({ productSlug: "glute-growth-guide" }),
    );
    expect(service.planNewProduct).not.toHaveBeenCalled();
  });
});
