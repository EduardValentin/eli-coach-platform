import { Readable } from "node:stream";

import {
  ProductAssetUnavailableError,
  type AccountSession,
  type ProductAsset,
  type ProductAssetStore,
  type StoreLibraryService,
} from "@eli-coach-platform/domain";
import { describe, expect, it, vi, type Mock } from "vitest";

import { StoreLibraryController } from "./library-controller.server";
import { createPublishedProduct } from "./published-product.test-support.server";
import type { ZipDeliveryRequest } from "./zip-stream.server";

type CreateArchive = (
  request: ZipDeliveryRequest,
) => Promise<NodeJS.ReadableStream>;

const guideAsset = {
  assetKey: "products/hormone-harmony.pdf",
  customerFilename: "Hormone Harmony.pdf",
  mimeType: "application/pdf",
  sizeBytes: 17,
  sha256: "a".repeat(64),
} satisfies ProductAsset;

const mealPlanAsset = {
  assetKey: "products/meal-plan.txt",
  customerFilename: "Meal Plan.txt",
  mimeType: "text/plain",
  sizeBytes: 21,
  sha256: "b".repeat(64),
} satisfies ProductAsset;

const OWNER_ACCOUNT_ID = "5f1d6d2c-0f34-4a04-8d47-f4b0a9f0d0d1";

const SIGNED_IN_ACCOUNT_ID = "5f1d6d2c-0f34-4a04-8d47-f4b0a9f0d0d1";

type Collaborators = {
  assetStore: {
    assertReady: ReturnType<typeof vi.fn>;
    openVerified: ReturnType<typeof vi.fn>;
  };
  libraryService: {
    findOwnedProductBySlug: ReturnType<typeof vi.fn>;
    listOwnedProducts: ReturnType<typeof vi.fn>;
  };
  zipDeliveryStream: { create: Mock<CreateArchive> };
};

type CollaboratorOverrides = Partial<
  Omit<Collaborators, "libraryService"> & {
    libraryService: Partial<Collaborators["libraryService"]>;
  }
>;

function createController(options: {
  collaborators?: CollaboratorOverrides;
}): { controller: StoreLibraryController; collaborators: Collaborators } {
  const overrides = options.collaborators ?? {};
  const collaborators: Collaborators = {
    assetStore: overrides.assetStore ?? {
      assertReady: vi.fn(),
      openVerified: vi.fn(async () => Readable.from([Buffer.from("guide-bytes")])),
    },
    libraryService: {
      findOwnedProductBySlug: vi.fn(),
      listOwnedProducts: vi.fn(),
      ...overrides.libraryService,
    },
    zipDeliveryStream: overrides.zipDeliveryStream ?? {
      create: vi.fn<CreateArchive>(async () => Readable.from([Buffer.from("zip-bytes")])),
    },
  };
  const controller = new StoreLibraryController({
    appBasePath: "/app",
    assetStore: collaborators.assetStore as unknown as ProductAssetStore,
    libraryService: collaborators.libraryService as unknown as StoreLibraryService,
    zipDeliveryStream: collaborators.zipDeliveryStream,
  });

  return { controller, collaborators };
}

describe("StoreLibraryController", () => {
  it("names the products the given account owns", async () => {
    // arrange
    const listOwnedProducts = vi.fn(async () => ({
      status: "available",
      products: [createPublishedProduct({ assets: [guideAsset] })],
    }));
    const { controller } = createController({
      collaborators: { libraryService: { listOwnedProducts } },
    });

    // act
    const response = await controller.getOwnedProducts(OWNER_ACCOUNT_ID);

    // assert
    expect(listOwnedProducts).toHaveBeenCalledWith(OWNER_ACCOUNT_ID);
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.json()).toMatchObject({
      success: true,
      products: [
        {
          slug: "hormone-harmony",
          title: "Hormone Harmony",
          cover: {
            alt: "Hormone Harmony cover",
            url: "/app/api/store/covers/covers%2Fhormone-harmony.webp",
          },
        },
      ],
    });
  });

  it("tells an owner the Library is temporarily unavailable rather than empty", async () => {
    // arrange
    const { controller } = createController({
      collaborators: {
        libraryService: {
          listOwnedProducts: vi.fn(async () => ({ status: "unavailable" })),
        },
      },
    });

    // act
    const response = await controller.getOwnedProducts(OWNER_ACCOUNT_ID);

    // assert
    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.json()).toEqual({
      success: false,
      error: {
        code: "server_error",
        message: "Your Library is temporarily unavailable.",
      },
    });
  });

  it("refuses a malformed slug without asking the Library", async () => {
    // arrange
    const { controller, collaborators } = createController({});

    // act
    const response = await controller.downloadOwnedProduct({
      rawSlug: "Not A Slug",
      signedInAccountId: SIGNED_IN_ACCOUNT_ID,
    });

    // assert
    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ error: "not_found" });
    expect(collaborators.libraryService.findOwnedProductBySlug).not.toHaveBeenCalled();
  });

  it("refuses a request carrying no slug without asking the Library", async () => {
    // arrange
    const { controller, collaborators } = createController({});

    // act
    const response = await controller.downloadOwnedProduct({
      rawSlug: undefined,
      signedInAccountId: SIGNED_IN_ACCOUNT_ID,
    });

    // assert
    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ error: "not_found" });
    expect(collaborators.libraryService.findOwnedProductBySlug).not.toHaveBeenCalled();
  });

  it("answers an unowned product exactly as it answers an unknown one", async () => {
    // arrange
    const { controller, collaborators } = createController({
      collaborators: {
        libraryService: {
          findOwnedProductBySlug: vi.fn(async () => ({ status: "not_found" })),
        },
      },
    });

    // act
    const response = await controller.downloadOwnedProduct({
      rawSlug: "someone-elses-guide",
      signedInAccountId: SIGNED_IN_ACCOUNT_ID,
    });

    // assert
    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ error: "not_found" });
    expect(collaborators.libraryService.findOwnedProductBySlug).toHaveBeenCalledWith({
      accountId: OWNER_ACCOUNT_ID,
      slug: "someone-elses-guide",
    });
  });

  it("keeps an unreadable catalogue distinct from an unowned product", async () => {
    // arrange
    const { controller } = createController({
      collaborators: {
        libraryService: {
          findOwnedProductBySlug: vi.fn(async () => ({
            status: "unavailable",
          })),
        },
      },
    });

    // act
    const response = await controller.downloadOwnedProduct({
      rawSlug: "hormone-harmony",
      signedInAccountId: SIGNED_IN_ACCOUNT_ID,
    });

    // assert
    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.json()).toEqual({
      error: "temporarily_unavailable",
    });
  });

  it("has nothing to download for an owned product carrying no assets", async () => {
    // arrange
    const { controller, collaborators } = createController({
      collaborators: {
        libraryService: {
          findOwnedProductBySlug: vi.fn(async () => ({
            status: "available",
            product: createPublishedProduct({ assets: [] }),
          })),
        },
      },
    });

    // act
    const response = await controller.downloadOwnedProduct({
      rawSlug: "hormone-harmony",
      signedInAccountId: SIGNED_IN_ACCOUNT_ID,
    });

    // assert
    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ error: "not_found" });
    expect(collaborators.assetStore.openVerified).not.toHaveBeenCalled();
  });

  it("streams a single owned asset under its customer filename", async () => {
    // arrange
    const { controller, collaborators } = createController({
      collaborators: {
        libraryService: {
          findOwnedProductBySlug: vi.fn(async () => ({
            status: "available",
            product: createPublishedProduct({ assets: [guideAsset] }),
          })),
        },
      },
    });

    // act
    const response = await controller.downloadOwnedProduct({
      rawSlug: "hormone-harmony",
      signedInAccountId: SIGNED_IN_ACCOUNT_ID,
    });

    // assert
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Content-Disposition")).toContain(
      'filename="Hormone Harmony.pdf"',
    );
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("Content-Security-Policy")).toBe(
      "sandbox; default-src 'none'",
    );
    expect(response.headers.get("Content-Length")).toBe(
      String(guideAsset.sizeBytes),
    );
    expect(await response.text()).toBe("guide-bytes");
    expect(collaborators.assetStore.openVerified).toHaveBeenCalledWith(guideAsset);
  });

  it("archives several owned assets under the product's own slug", async () => {
    // arrange
    const product = createPublishedProduct({
      assets: [guideAsset, mealPlanAsset],
    });
    const { controller, collaborators } = createController({
      collaborators: {
        libraryService: {
          findOwnedProductBySlug: vi.fn(async () => ({
            status: "available",
            product,
          })),
        },
      },
    });

    // act
    const response = await controller.downloadOwnedProduct({
      rawSlug: "hormone-harmony",
      signedInAccountId: SIGNED_IN_ACCOUNT_ID,
    });

    // assert
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/zip");
    expect(response.headers.get("Content-Disposition")).toContain(
      'filename="hormone-harmony.zip"',
    );
    expect(await response.text()).toBe("zip-bytes");
    expect(collaborators.zipDeliveryStream.create).toHaveBeenCalledWith({
      items: [
        {
          assets: [guideAsset, mealPlanAsset],
          productSlug: "hormone-harmony",
        },
      ],
    });
  });

  it("reports an unreadable asset as temporary rather than as a missing product", async () => {
    // arrange
    const { controller } = createController({
      collaborators: {
        assetStore: {
          assertReady: vi.fn(),
          openVerified: vi.fn(async () => {
            throw new ProductAssetUnavailableError("Asset is unavailable.");
          }),
        },
        libraryService: {
          findOwnedProductBySlug: vi.fn(async () => ({
            status: "available",
            product: createPublishedProduct({ assets: [guideAsset] }),
          })),
        },
      },
    });

    // act
    const response = await controller.downloadOwnedProduct({
      rawSlug: "hormone-harmony",
      signedInAccountId: SIGNED_IN_ACCOUNT_ID,
    });

    // assert
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: "temporarily_unavailable",
    });
  });

  it("reports a failed archive as temporary", async () => {
    // arrange
    const { controller } = createController({
      collaborators: {
        libraryService: {
          findOwnedProductBySlug: vi.fn(async () => ({
            status: "available",
            product: createPublishedProduct({
              assets: [guideAsset, mealPlanAsset],
            }),
          })),
        },
        zipDeliveryStream: {
          create: vi.fn<CreateArchive>(async () => {
            throw new Error("archive failed");
          }),
        },
      },
    });

    // act
    const response = await controller.downloadOwnedProduct({
      rawSlug: "hormone-harmony",
      signedInAccountId: SIGNED_IN_ACCOUNT_ID,
    });

    // assert
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: "temporarily_unavailable",
    });
  });
});
