import { describe, expect, it, vi } from "vitest";

import { storeContext } from "~/features/store/server/guards/store-context.server";
import type { StoreFeature } from "~/features/store/server/store-composition.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/server/test-support/request-args";

import * as acquisitionsRoute from "./acquisitions";
import * as catalogRoute from "./catalog";
import * as coverRoute from "./covers";
import * as downloadsRoute from "./downloads";
import * as managementProductRoute from "./management-product";
import * as managementProductValidationsRoute from "./management-product-validations";
import * as managementProductVersionsRoute from "./management-product-versions";
import * as managementProductsRoute from "./management-products";

function storeArgs(
  request: Request,
  feature: Partial<StoreFeature>,
  params: Record<string, string> = {},
) {
  return createRequestArgs({
    contexts: [contextEntry(storeContext, feature as StoreFeature)],
    params,
    request,
  });
}

describe("Store API routes", () => {
  it("routes catalog GET requests and rejects mutations", async () => {
    // arrange
    const response = Response.json({ products: [], success: true });
    const getPublishedCatalog = vi.fn().mockResolvedValue(response);
    const args = storeArgs(
      new Request("https://eli.example/api/store/catalog"),
      { catalog: { getPublishedCatalog } as never },
    );

    // act
    const loaded = await catalogRoute.loader(args);
    const rejected = await catalogRoute.action(args);

    // assert
    expect(loaded).toBe(response);
    expect(rejected.status).toBe(405);
    expect(rejected.headers.get("Allow")).toBe("GET, HEAD");
  });

  it("routes acquisition and download POST requests at request time", async () => {
    // arrange
    const acquisitionRequest = new Request(
      "https://eli.example/api/store/acquisitions",
      { method: "POST" },
    );
    const downloadRequest = new Request(
      "https://eli.example/api/store/downloads",
      { method: "POST" },
    );
    const acquisitionResponse = Response.json(
      { success: true },
      { status: 201 },
    );
    const downloadResponse = new Response("file");
    const acquire = vi.fn().mockResolvedValue(acquisitionResponse);
    const download = vi.fn().mockResolvedValue(downloadResponse);

    // act
    const acquired = await acquisitionsRoute.action(
      storeArgs(acquisitionRequest, { acquisitions: { acquire } as never }),
    );
    const downloaded = await downloadsRoute.action(
      storeArgs(downloadRequest, { downloads: { download } as never }),
    );

    // assert
    expect(acquired).toBe(acquisitionResponse);
    expect(downloaded).toBe(downloadResponse);
    expect(acquire).toHaveBeenCalledWith(acquisitionRequest);
    expect(download).toHaveBeenCalledWith(downloadRequest);
  });

  it("routes only published cover keys and keeps a missing key at 404", async () => {
    // arrange
    const response = new Response("cover");
    const getCover = vi.fn().mockResolvedValue(response);
    const request = new Request(
      "https://eli.example/api/store/covers/cover.webp",
    );
    const feature = { covers: { getCover } as never };

    // act
    const loaded = await coverRoute.loader(
      storeArgs(request, feature, { assetKey: "cover.webp" }),
    );
    const missing = await coverRoute.loader(storeArgs(request, feature));

    // assert
    expect(loaded).toBe(response);
    expect(getCover).toHaveBeenCalledWith("cover.webp");
    expect(missing.status).toBe(404);
  });

  it("routes every management operation to its controller method", async () => {
    // arrange
    const planned = Response.json({ success: true });
    const published = Response.json({ success: true }, { status: 201 });
    const revised = Response.json({ success: true }, { status: 201 });
    const retired = Response.json({ success: true });
    const management = {
      publishProduct: vi.fn().mockResolvedValue(published),
      publishProductVersion: vi.fn().mockResolvedValue(revised),
      retireProduct: vi.fn().mockResolvedValue(retired),
      validate: vi.fn().mockResolvedValue(planned),
    };
    const feature = { management: management as never };
    const validationRequest = new Request(
      "https://eli.example/api/management/store/product-validations",
      { method: "POST" },
    );
    const publishRequest = new Request(
      "https://eli.example/api/management/store/products",
      { method: "POST" },
    );
    const reviseRequest = new Request(
      "https://eli.example/api/management/store/products/7/versions",
      { method: "POST" },
    );
    const retireRequest = new Request(
      "https://eli.example/api/management/store/products/7",
      { method: "PATCH" },
    );

    // act
    const validated = await managementProductValidationsRoute.action(
      storeArgs(validationRequest, feature),
    );
    const created = await managementProductsRoute.action(
      storeArgs(publishRequest, feature),
    );
    const versioned = await managementProductVersionsRoute.action(
      storeArgs(reviseRequest, feature, { productId: "7" }),
    );
    const archived = await managementProductRoute.action(
      storeArgs(retireRequest, feature, { productId: "7" }),
    );

    // assert
    expect(validated).toBe(planned);
    expect(created).toBe(published);
    expect(versioned).toBe(revised);
    expect(archived).toBe(retired);
    expect(management.validate).toHaveBeenCalledWith(validationRequest);
    expect(management.publishProduct).toHaveBeenCalledWith(publishRequest);
    expect(management.publishProductVersion).toHaveBeenCalledWith(
      reviseRequest,
      "7",
    );
    expect(management.retireProduct).toHaveBeenCalledWith(retireRequest, "7");
  });

  it("rejects management requests using the wrong method", async () => {
    // arrange
    const management = {
      publishProduct: vi.fn(),
      publishProductVersion: vi.fn(),
      retireProduct: vi.fn(),
      validate: vi.fn(),
    };
    const feature = { management: management as never };
    const readRequest = new Request(
      "https://eli.example/api/management/store/products",
      { method: "GET" },
    );

    // act
    const responses = await Promise.all([
      managementProductValidationsRoute.loader(storeArgs(readRequest, feature)),
      managementProductsRoute.loader(storeArgs(readRequest, feature)),
      managementProductVersionsRoute.loader(storeArgs(readRequest, feature)),
      managementProductRoute.loader(storeArgs(readRequest, feature)),
      managementProductsRoute.action(storeArgs(readRequest, feature)),
      managementProductRoute.action(
        storeArgs(
          new Request("https://eli.example/api/management/store/products/7", {
            method: "POST",
          }),
          feature,
          { productId: "7" },
        ),
      ),
    ]);

    // assert
    expect(responses.map((response) => response.status)).toEqual([
      405, 405, 405, 405, 405, 405,
    ]);
    expect(management.publishProduct).not.toHaveBeenCalled();
    expect(management.retireProduct).not.toHaveBeenCalled();
  });
});
