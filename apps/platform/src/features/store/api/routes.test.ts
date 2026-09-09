import {
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  acquire: vi.fn(),
  download: vi.fn(),
  downloadOwnedProduct: vi.fn(),
  getCover: vi.fn(),
  getPublishedCatalog: vi.fn(),
  getPlatformContainer: vi.fn(),
  publishProduct: vi.fn(),
  requireApiAccount: vi.fn(),
  publishProductVersion: vi.fn(),
  retireProduct: vi.fn(),
  validate: vi.fn(),
}));

vi.mock("~/server/container.server", () => ({
  getPlatformContainer: mocks.getPlatformContainer,
}));

import * as acquisitionsRoute from "./acquisitions";
import * as catalogRoute from "./catalog";
import * as coverRoute from "./covers";
import * as downloadsRoute from "./email-downloads";
import * as libraryDownloadRoute from "./library-download";
import * as managementProductRoute from "./management-product";
import * as managementProductValidationsRoute from "./management-product-validations";
import * as managementProductVersionsRoute from "./management-product-versions";
import * as managementProductsRoute from "./management-products";

describe("Store API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPlatformContainer.mockReturnValue({
      storeAcquisitionController: { acquire: mocks.acquire },
      storeCatalogController: {
        getPublishedCatalog: mocks.getPublishedCatalog,
      },
      storeCoverAssetController: { getCover: mocks.getCover },
      storeEmailDownloadController: { download: mocks.download },
      requireApiAccount: mocks.requireApiAccount,
      storeLibraryController: {
        downloadOwnedProduct: mocks.downloadOwnedProduct,
      },
      storeProductManagementController: {
        publishProduct: mocks.publishProduct,
        publishProductVersion: mocks.publishProductVersion,
        retireProduct: mocks.retireProduct,
        validate: mocks.validate,
      },
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

  it("routes an owned-product download and refuses anything but a GET", async () => {
    // arrange
    const response = new Response("guide");
    mocks.requireApiAccount.mockReturnValue({ id: "acct_1" });
    mocks.downloadOwnedProduct.mockResolvedValue(response);
    const downloadArgs = {
      params: { slug: "hormone-harmony" },
      request: new Request(
        "https://eli.example/api/store/library/hormone-harmony/download",
      ),
    } as unknown as LoaderFunctionArgs;

    // act
    const downloaded = await libraryDownloadRoute.loader(downloadArgs);
    const rejected = await libraryDownloadRoute.action({} as ActionFunctionArgs);

    // assert
    expect(downloaded).toBe(response);
    expect(mocks.requireApiAccount).toHaveBeenCalledWith(downloadArgs);
    expect(mocks.downloadOwnedProduct).toHaveBeenCalledWith({
      rawSlug: "hormone-harmony",
      signedInAccountId: "acct_1",
    });
    expect(rejected.status).toBe(405);
    expect(rejected.headers.get("Allow")).toBe("GET");
    expect(mocks.downloadOwnedProduct).toHaveBeenCalledTimes(1);
  });

  it("hands the Library controller the slug exactly as the URL carried it", async () => {
    // arrange
    mocks.requireApiAccount.mockReturnValue({ id: "acct_1" });
    mocks.downloadOwnedProduct.mockResolvedValue(new Response(null, { status: 404 }));
    const malformedSlugArgs = {
      params: { slug: "Not A Slug" },
      request: new Request(
        "https://eli.example/api/store/library/Not%20A%20Slug/download",
      ),
    } as unknown as LoaderFunctionArgs;

    // act
    await libraryDownloadRoute.loader(malformedSlugArgs);

    // assert
    expect(mocks.downloadOwnedProduct).toHaveBeenCalledWith({
      rawSlug: "Not A Slug",
      signedInAccountId: "acct_1",
    });
  });

  it("answers a signed-out download with the guard's refusal, before the Library is asked", async () => {
    // arrange
    const refusal = Response.json({ error: "unauthenticated" }, { status: 401 });
    mocks.requireApiAccount.mockImplementation(() => {
      throw refusal;
    });
    const signedOutArgs = {
      params: { slug: "hormone-harmony" },
      request: new Request(
        "https://eli.example/api/store/library/hormone-harmony/download",
      ),
    } as unknown as LoaderFunctionArgs;

    // act
    const outcome = libraryDownloadRoute.loader(signedOutArgs);

    // assert
    await expect(outcome).rejects.toBe(refusal);
    expect(mocks.downloadOwnedProduct).not.toHaveBeenCalled();
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

  it("routes every management operation to its controller method", async () => {
    // arrange
    const planned = Response.json({ success: true });
    const published = Response.json({ success: true }, { status: 201 });
    const revised = Response.json({ success: true }, { status: 201 });
    const retired = Response.json({ success: true });

    mocks.validate.mockResolvedValue(planned);
    mocks.publishProduct.mockResolvedValue(published);
    mocks.publishProductVersion.mockResolvedValue(revised);
    mocks.retireProduct.mockResolvedValue(retired);

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
    const validated = await managementProductValidationsRoute.action({
      request: validationRequest,
    } as ActionFunctionArgs);
    const created = await managementProductsRoute.action({
      request: publishRequest,
    } as ActionFunctionArgs);
    const versioned = await managementProductVersionsRoute.action({
      params: { productId: "7" },
      request: reviseRequest,
    } as unknown as ActionFunctionArgs);
    const archived = await managementProductRoute.action({
      params: { productId: "7" },
      request: retireRequest,
    } as unknown as ActionFunctionArgs);

    // assert
    expect(validated).toBe(planned);
    expect(created).toBe(published);
    expect(versioned).toBe(revised);
    expect(archived).toBe(retired);
    expect(mocks.validate).toHaveBeenCalledWith(validationRequest);
    expect(mocks.publishProduct).toHaveBeenCalledWith(publishRequest);
    expect(mocks.publishProductVersion).toHaveBeenCalledWith(
      reviseRequest,
      "7",
    );
    expect(mocks.retireProduct).toHaveBeenCalledWith(retireRequest, "7");
  });

  it("rejects management requests using the wrong method", async () => {
    // arrange
    const wrongMethod = { method: "GET" };

    // act
    const responses = await Promise.all([
      managementProductValidationsRoute.loader({} as LoaderFunctionArgs),
      managementProductsRoute.loader({} as LoaderFunctionArgs),
      managementProductVersionsRoute.loader({} as LoaderFunctionArgs),
      managementProductRoute.loader({} as LoaderFunctionArgs),
      managementProductsRoute.action({
        request: new Request(
          "https://eli.example/api/management/store/products",
          wrongMethod,
        ),
      } as ActionFunctionArgs),
      managementProductRoute.action({
        params: { productId: "7" },
        request: new Request(
          "https://eli.example/api/management/store/products/7",
          { method: "POST" },
        ),
      } as unknown as ActionFunctionArgs),
    ]);

    // assert
    expect(responses.map((response) => response.status)).toEqual([
      405, 405, 405, 405, 405, 405,
    ]);
    expect(mocks.publishProduct).not.toHaveBeenCalled();
    expect(mocks.retireProduct).not.toHaveBeenCalled();
  });
});
