import { Readable } from "node:stream";

import {
  ProductAssetUnavailableError,
  type ProductAsset,
  type ProductAssetStore,
  type PublishedStoreProduct,
  type StoreLibraryService,
  type AccountSession,
} from "@eli-coach-platform/domain";
import type { LoaderFunctionArgs } from "react-router";
import { describe, expect, it, vi, type Mock } from "vitest";

import {
  StoreLibraryController,
} from "./library-controller.server";
import type { ZipDeliveryRequest } from "./zip-stream.server";

type CreateArchive = (
  request: ZipDeliveryRequest,
) => Promise<NodeJS.ReadableStream>;

type LinkPriorAcquisitions = (args: LoaderFunctionArgs) => Promise<void>;

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

function createProduct(
  assets: readonly ProductAsset[],
): PublishedStoreProduct {
  return {
    id: 7,
    slug: "hormone-harmony",
    displayOrder: 1,
    version: {
      id: 11,
      sequence: 2,
      title: "Hormone Harmony",
      creatorName: "Evoa Fitness",
      cardSummary: "A practical cycle-aware guide.",
      detailDescription:
        "Learn how energy and recovery change across the cycle.",
      includedItems: ["Phase-by-phase guidance"],
      cover: {
        assetKey: "covers/hormone-harmony.webp",
        alt: "Hormone Harmony guide cover",
        mimeType: "image/webp",
        sizeBytes: 96,
        sha256: "c".repeat(64),
      },
      assets,
      types: [{ slug: "e-books", label: "E-Books", displayOrder: 3 }],
      goals: [{ slug: "wellness", label: "Wellness", displayOrder: 3 }],
      publishedAt: new Date("2026-07-30T10:00:00.000Z"),
    },
  };
}

const signedInSession: AccountSession = {
  kind: "authenticated",
  account: {
    authSubjectId: "user_library_reader",
    deletedAt: null,
    id: "5f1d6d2c-0f34-4a04-8d47-f4b0a9f0d0d1",
    role: "USER",
  },
};

const loaderArgs = { params: {} } as unknown as LoaderFunctionArgs;

type Collaborators = {
  assetStore: {
    assertReady: ReturnType<typeof vi.fn>;
    openVerified: ReturnType<typeof vi.fn>;
  };
  libraryService: {
    findOwnedProductBySlug: ReturnType<typeof vi.fn>;
    listOwnedProducts: ReturnType<typeof vi.fn>;
  };
  linkPriorAcquisitions: Mock<LinkPriorAcquisitions>;
  zipDeliveryStream: { create: Mock<CreateArchive> };
};

type CollaboratorOverrides = Partial<
  Omit<Collaborators, "libraryService"> & {
    libraryService: Partial<Collaborators["libraryService"]>;
  }
>;

function createController(options: {
  collaborators?: CollaboratorOverrides;
  session?: AccountSession;
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
    linkPriorAcquisitions:
      overrides.linkPriorAcquisitions ??
      vi.fn<LinkPriorAcquisitions>(async () => undefined),
    zipDeliveryStream: overrides.zipDeliveryStream ?? {
      create: vi.fn<CreateArchive>(async () => Readable.from([Buffer.from("zip-bytes")])),
    },
  };
  const controller = new StoreLibraryController({
    appBasePath: "/app",
    assetStore: collaborators.assetStore as unknown as ProductAssetStore,
    libraryService: collaborators.libraryService as unknown as StoreLibraryService,
    ownershipLinking: { linkPriorAcquisitions: collaborators.linkPriorAcquisitions },
    readSession: () => options.session ?? { kind: "anonymous" },
    zipDeliveryStream: collaborators.zipDeliveryStream,
  });

  return { controller, collaborators };
}

describe("StoreLibraryController", () => {
  it("refuses to name a signed-out visitor's Library", async () => {
    // arrange
    const { controller, collaborators } = createController({});

    // act
    const response = await controller.getOwnedProducts(loaderArgs);

    // assert
    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ error: "unauthenticated" });
    expect(collaborators.libraryService.listOwnedProducts).not.toHaveBeenCalled();
    expect(collaborators.linkPriorAcquisitions).not.toHaveBeenCalled();
  });

  it("claims prior acquisitions before reading the account's owned products", async () => {
    // arrange
    const order: string[] = [];
    const linkPriorAcquisitions = vi.fn<LinkPriorAcquisitions>(async () => {
      order.push("link");
    });
    const listOwnedProducts = vi.fn(async () => {
      order.push("list");

      return { status: "available", products: [createProduct([guideAsset])] };
    });
    const { controller } = createController({
      collaborators: {
        libraryService: {
            listOwnedProducts,
        },
        linkPriorAcquisitions,
      },
      session: signedInSession,
    });

    // act
    const response = await controller.getOwnedProducts(loaderArgs);

    // assert
    expect(order).toEqual(["link", "list"]);
    expect(listOwnedProducts).toHaveBeenCalledWith(signedInSession.account.id);
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.json()).toMatchObject({
      success: true,
      products: [
        {
          slug: "hormone-harmony",
          title: "Hormone Harmony",
          cover: {
            alt: "Hormone Harmony guide cover",
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
      session: signedInSession,
    });

    // act
    const response = await controller.getOwnedProducts(loaderArgs);

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

  it("refuses a signed-out download without looking the product up", async () => {
    // arrange
    const { controller, collaborators } = createController({});

    // act
    const response = await controller.downloadOwnedProduct(
      loaderArgs,
      "hormone-harmony",
    );

    // assert
    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ error: "unauthenticated" });
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
      session: signedInSession,
    });

    // act
    const response = await controller.downloadOwnedProduct(
      loaderArgs,
      "someone-elses-guide",
    );

    // assert
    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ error: "not_found" });
    expect(collaborators.libraryService.findOwnedProductBySlug).toHaveBeenCalledWith({
      accountId: signedInSession.account.id,
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
      session: signedInSession,
    });

    // act
    const response = await controller.downloadOwnedProduct(
      loaderArgs,
      "hormone-harmony",
    );

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
            product: createProduct([]),
          })),
          },
      },
      session: signedInSession,
    });

    // act
    const response = await controller.downloadOwnedProduct(
      loaderArgs,
      "hormone-harmony",
    );

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
            product: createProduct([guideAsset]),
          })),
          },
      },
      session: signedInSession,
    });

    // act
    const response = await controller.downloadOwnedProduct(
      loaderArgs,
      "hormone-harmony",
    );

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
    const product = createProduct([guideAsset, mealPlanAsset]);
    const { controller, collaborators } = createController({
      collaborators: {
        libraryService: {
          findOwnedProductBySlug: vi.fn(async () => ({
            status: "available",
            product,
          })),
          },
      },
      session: signedInSession,
    });

    // act
    const response = await controller.downloadOwnedProduct(
      loaderArgs,
      "hormone-harmony",
    );

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
            product: createProduct([guideAsset]),
          })),
          },
      },
      session: signedInSession,
    });

    // act
    const response = await controller.downloadOwnedProduct(
      loaderArgs,
      "hormone-harmony",
    );

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
            product: createProduct([guideAsset, mealPlanAsset]),
          })),
          },
        zipDeliveryStream: {
          create: vi.fn<CreateArchive>(async () => {
            throw new Error("archive failed");
          }),
        },
      },
      session: signedInSession,
    });

    // act
    const response = await controller.downloadOwnedProduct(
      loaderArgs,
      "hormone-harmony",
    );

    // assert
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: "temporarily_unavailable",
    });
  });
});
