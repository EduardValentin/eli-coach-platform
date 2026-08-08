import {
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  acquire: vi.fn(),
  download: vi.fn(),
  getCover: vi.fn(),
  getPublishedCatalog: vi.fn(),
  getPlatformContainer: vi.fn(),
}));

vi.mock("~/server/container.server", () => ({
  getPlatformContainer: mocks.getPlatformContainer,
}));

import * as acquisitionsRoute from "./api.store-acquisitions";
import * as catalogRoute from "./api.store-catalog";
import * as coverRoute from "./api.store-cover";
import * as downloadsRoute from "./api.store-downloads";

describe("Store API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPlatformContainer.mockReturnValue({
      storeAcquisitionController: { acquire: mocks.acquire },
      storeCatalogController: {
        getPublishedCatalog: mocks.getPublishedCatalog,
      },
      storeCoverAssetController: { getCover: mocks.getCover },
      storeDownloadController: { download: mocks.download },
    });
  });

  it("routes catalog GET requests and rejects mutations", async () => {
    // arrange
    const response = Response.json({ products: [], success: true });
    mocks.getPublishedCatalog.mockResolvedValue(response);

    // act
    const loaded = await catalogRoute.loader({
      request: new Request("https://eli.example/api/store/catalog"),
    } as LoaderFunctionArgs);
    const rejected = await catalogRoute.action({} as ActionFunctionArgs);

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
    mocks.acquire.mockResolvedValue(acquisitionResponse);
    mocks.download.mockResolvedValue(downloadResponse);

    // act
    const acquired = await acquisitionsRoute.action({
      request: acquisitionRequest,
    } as ActionFunctionArgs);
    const downloaded = await downloadsRoute.action({
      request: downloadRequest,
    } as ActionFunctionArgs);

    // assert
    expect(acquired).toBe(acquisitionResponse);
    expect(downloaded).toBe(downloadResponse);
    expect(mocks.acquire).toHaveBeenCalledWith(acquisitionRequest);
    expect(mocks.download).toHaveBeenCalledWith(downloadRequest);
  });

  it("routes only published cover keys and keeps a missing key at 404", async () => {
    // arrange
    const response = new Response("cover");
    mocks.getCover.mockResolvedValue(response);
    const request = new Request(
      "https://eli.example/api/store/covers/cover.webp",
    );

    // act
    const loaded = await coverRoute.loader({
      params: { assetKey: "cover.webp" },
      request,
    } as unknown as LoaderFunctionArgs);
    const missing = await coverRoute.loader({
      params: {},
      request,
    } as unknown as LoaderFunctionArgs);

    // assert
    expect(loaded).toBe(response);
    expect(mocks.getCover).toHaveBeenCalledWith("cover.webp");
    expect(missing.status).toBe(404);
  });
});
