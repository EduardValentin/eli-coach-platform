import { basename } from "node:path";

import type {
  ProductAsset,
  ProductAssetStore,
  PublishedStoreProduct,
  StoreLibraryService,
} from "@eli-coach-platform/domain";

import {
  productSlugSchema,
  storeLibraryResponseSchema,
} from "~/features/store/contracts/store";

import { createStreamResponse } from "./asset-response.server";
import { toStoreProduct } from "./store-product-response.server";
import type { ZipDeliveryStreamPort } from "./zip-stream.server";

type StoreLibraryControllerOptions = {
  appBasePath: string;
  assetStore: ProductAssetStore;
  libraryService: StoreLibraryService;
  zipDeliveryStream: ZipDeliveryStreamPort;
};

const UNAVAILABLE_LIBRARY_MESSAGE = "Your Library is temporarily unavailable.";

const PRIVATE_RESPONSE_HEADERS = { "Cache-Control": "private, no-store" };

export class StoreLibraryController {
  constructor(private readonly options: StoreLibraryControllerOptions) {}

  async getOwnedProducts(signedInAccountId: string): Promise<Response> {
    const result =
      await this.options.libraryService.listOwnedProducts(signedInAccountId);

    if (result.status === "unavailable") {
      return Response.json(
        storeLibraryResponseSchema.parse({
          error: {
            code: "server_error",
            message: UNAVAILABLE_LIBRARY_MESSAGE,
          },
          success: false,
        }),
        { headers: PRIVATE_RESPONSE_HEADERS, status: 503 },
      );
    }

    return Response.json(
      storeLibraryResponseSchema.parse({
        products: result.products.map((product) =>
          toStoreProduct(product, this.options),
        ),
        success: true,
      }),
      { headers: PRIVATE_RESPONSE_HEADERS },
    );
  }

  async downloadOwnedProduct(download: {
    rawSlug: string | undefined;
    signedInAccountId: string;
  }): Promise<Response> {
    const { rawSlug, signedInAccountId } = download;
    const productSlug = productSlugSchema.safeParse(rawSlug);

    if (!productSlug.success) {
      return createNotFoundResponse();
    }

    const result = await this.options.libraryService.findOwnedProductBySlug({
      accountId: signedInAccountId,
      slug: productSlug.data,
    });

    if (result.status === "unavailable") {
      return createTemporarilyUnavailableResponse();
    }

    if (result.status === "not_found") {
      return createNotFoundResponse();
    }

    if (result.product.version.assets.length === 0) {
      return createNotFoundResponse();
    }

    try {
      return await this.streamOwnedProduct(result.product);
    } catch (error) {
      console.error("A Library download did not complete.", {
        errorCategory: "store_library_download_failed",
        reason: error instanceof Error ? error.message : "unknown",
      });

      return createTemporarilyUnavailableResponse();
    }
  }

  private async streamOwnedProduct(
    product: PublishedStoreProduct,
  ): Promise<Response> {
    const [onlyAsset, ...remainingAssets] = product.version.assets;

    if (onlyAsset && remainingAssets.length === 0) {
      return this.streamSingleAsset(onlyAsset);
    }

    const stream = await this.options.zipDeliveryStream.create({
      items: [
        {
          assets: product.version.assets,
          productSlug: product.slug,
        },
      ],
    });

    return createStreamResponse(stream, {
      filename: `${product.slug}.zip`,
      mimeType: "application/zip",
    });
  }

  private async streamSingleAsset(asset: ProductAsset): Promise<Response> {
    const sizeVerifiedStream = await this.options.assetStore.openVerified(asset);

    return createStreamResponse(sizeVerifiedStream, {
      contentLength: asset.sizeBytes,
      filename: basename(asset.customerFilename),
      mimeType: asset.mimeType,
    });
  }
}

function createNotFoundResponse(): Response {
  return Response.json(
    { error: "not_found" },
    { headers: PRIVATE_RESPONSE_HEADERS, status: 404 },
  );
}

function createTemporarilyUnavailableResponse(): Response {
  return Response.json(
    { error: "temporarily_unavailable" },
    { headers: PRIVATE_RESPONSE_HEADERS, status: 503 },
  );
}
