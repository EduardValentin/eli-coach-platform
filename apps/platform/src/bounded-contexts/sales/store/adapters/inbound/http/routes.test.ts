import { describe, expect, it, vi } from "vitest";

import {
  storeContext,
  type StoreFeature,
} from "~/bounded-contexts/sales/store/adapters/inbound/http/context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/composition-root/test-support/request-args";

import * as acquisitionsRoute from "./acquisitions/acquisitions";
import * as catalogRoute from "./catalog/catalog";
import * as checkoutsRoute from "./checkouts/checkouts";
import * as coverRoute from "./covers/covers";
import * as downloadsRoute from "./downloads/downloads";
import * as managementProductRoute from "./management/management-product";
import * as managementProductPricesRoute from "./management/management-product-prices";
import * as managementProductValidationsRoute from "./management/management-product-validations";
import * as managementProductVersionsRoute from "./management/management-product-versions";
import * as managementProductsRoute from "./management/management-products";
import * as orderEmailsRoute from "./orders/order-emails";

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
      { storeCatalogController: { getPublishedCatalog } as never },
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
      storeArgs(acquisitionRequest, {
        storeAcquisitionController: { acquire } as never,
      }),
    );
    const downloaded = await downloadsRoute.action(
      storeArgs(downloadRequest, {
        storeDownloadController: { download } as never,
      }),
    );

    // assert
    expect(acquired).toBe(acquisitionResponse);
    expect(downloaded).toBe(downloadResponse);
    expect(acquire).toHaveBeenCalledWith(acquisitionRequest);
    expect(download).toHaveBeenCalledWith(downloadRequest);
  });

  it("routes checkout and order email POST requests and refuses reads", async () => {
    // arrange
    const checkoutRequest = new Request(
      "https://eli.example/api/store/checkouts",
      { method: "POST" },
    );
    const resendRequest = new Request(
      "https://eli.example/api/store/orders/email",
      { method: "POST" },
    );
    const checkoutResponse = Response.json(
      { success: true, checkoutUrl: "https://checkout.stripe.com/c/pay/cs" },
      { status: 201 },
    );
    const resendResponse = Response.json({ success: true, outcome: "sent" });
    const placeOrder = vi.fn().mockResolvedValue(checkoutResponse);
    const resendEmail = vi.fn().mockResolvedValue(resendResponse);
    const feature = {
      storeCheckoutController: { placeOrder } as never,
      storeOrderController: { resendEmail } as never,
    };

    // act
    const placed = await checkoutsRoute.action(
      storeArgs(checkoutRequest, feature),
    );
    const resent = await orderEmailsRoute.action(
      storeArgs(resendRequest, feature),
    );
    const checkoutRead = await checkoutsRoute.loader(
      storeArgs(
        new Request("https://eli.example/api/store/checkouts"),
        feature,
      ),
    );
    const resendRead = await orderEmailsRoute.loader(
      storeArgs(
        new Request("https://eli.example/api/store/orders/email"),
        feature,
      ),
    );

    // assert
    expect(placed).toBe(checkoutResponse);
    expect(resent).toBe(resendResponse);
    expect(placeOrder).toHaveBeenCalledWith(checkoutRequest);
    expect(resendEmail).toHaveBeenCalledWith(resendRequest);
    expect(checkoutRead.status).toBe(405);
    expect(resendRead.status).toBe(405);
  });

  it("routes only published cover keys and keeps a missing key at 404", async () => {
    // arrange
    const response = new Response("cover");
    const getCover = vi.fn().mockResolvedValue(response);
    const request = new Request(
      "https://eli.example/api/store/covers/cover.webp",
    );
    const feature = { storeCoverAssetController: { getCover } as never };

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
    const feature = { storeProductManagementController: management as never };
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
    const feature = { storeProductManagementController: management as never };
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

  it("routes a price change POST to its controller method and rejects other methods", async () => {
    // arrange
    const repriced = Response.json({ success: true }, { status: 201 });
    const management = {
      changeProductPrice: vi.fn().mockResolvedValue(repriced),
    };
    const feature = { storeProductManagementController: management as never };
    const priceChangeRequest = new Request(
      "https://eli.example/api/management/store/products/7/prices",
      { method: "POST" },
    );
    const readRequest = new Request(
      "https://eli.example/api/management/store/products/7/prices",
      { method: "GET" },
    );

    // act
    const changed = await managementProductPricesRoute.action(
      storeArgs(priceChangeRequest, feature, { productId: "7" }),
    );
    const rejectedRead = await managementProductPricesRoute.loader(
      storeArgs(readRequest, feature, { productId: "7" }),
    );
    const rejectedPatch = await managementProductPricesRoute.action(
      storeArgs(
        new Request(
          "https://eli.example/api/management/store/products/7/prices",
          { method: "PATCH" },
        ),
        feature,
        { productId: "7" },
      ),
    );

    // assert
    expect(changed).toBe(repriced);
    expect(management.changeProductPrice).toHaveBeenCalledWith(
      priceChangeRequest,
      "7",
    );
    expect(rejectedRead.status).toBe(405);
    expect(rejectedPatch.status).toBe(405);
    expect(management.changeProductPrice).toHaveBeenCalledTimes(1);
  });
});
