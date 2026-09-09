import { basename } from "node:path";

import type { AccountSession, ProductAsset, ProductAssetStore, PublishedStoreProduct, StoreLibraryService } from "@eli-coach-platform/domain";
import type { LoaderFunctionArgs } from "react-router";

import { storeLibraryResponseSchema } from "~/features/store/contracts/store";

import { createStreamResponse } from "./asset-response.server";
import type { StoreOwnershipController } from "./ownership-controller.server";
import { toStoreProduct } from "./store-product-response.server";
import type { ZipDeliveryStreamPort } from "./zip-stream.server";

type StoreLibraryControllerOptions = {
  appBasePath: string;
  assetStore: ProductAssetStore;
  libraryService: StoreLibraryService;
  ownershipLinking: Pick<StoreOwnershipController, "linkPriorAcquisitions">;
  readSession: (args: LoaderFunctionArgs) => AccountSession;
  zipDeliveryStream: ZipDeliveryStreamPort;
};

const UNAVAILABLE_LIBRARY_MESSAGE = "Your Library is temporarily unavailable.";

const PRIVATE_RESPONSE_HEADERS = { "Cache-Control": "private, no-store" };

export class StoreLibraryController {
  constructor(private readonly options: StoreLibraryControllerOptions) {}

  async getOwnedProducts(args: LoaderFunctionArgs): Promise<Response> {
    const session = this.options.readSession(args);

    if (session.kind === "anonymous") {
      return createUnauthenticatedResponse();
    }

    // A returning customer's guest purchases become theirs on the way in, so
    // the Library they are about to read already carries them.
    await this.options.ownershipLinking.linkPriorAcquisitions(args);

    const result = await this.options.libraryService.listOwnedProducts(
      session.account.id,
    );

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

  async downloadOwnedProduct(
    args: LoaderFunctionArgs,
    slug: string,
  ): Promise<Response> {
    const session = this.options.readSession(args);

    if (session.kind === "anonymous") {
      return createUnauthenticatedResponse();
    }

    const result = await this.options.libraryService.findOwnedProductBySlug({
      accountId: session.account.id,
      slug,
    });

    if (result.status === "unavailable") {
      return createTemporarilyUnavailableResponse();
    }

    // A product nobody owns and a product nobody published answer alike, so
    // the endpoint never tells a stranger what the Store already hides.
    if (result.status === "not_found") {
      return createNotFoundResponse();
    }

    // Nothing to hand over, and naming the gap would name the product.
    if (result.product.version.assets.length === 0) {
      return createNotFoundResponse();
    }

    try {
      return await this.streamOwnedProduct(result.product);
    } catch (error) {
      // Carries the reason, not just the category: this catch hides every
      // failure a download has, and only the message — the error itself can
      // carry the request.
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
    const stream = await this.options.assetStore.openVerified(asset);

    return createStreamResponse(stream, {
      // Safe to promise: the asset store rejects a file whose size disagrees
      // with the recorded one before it hands the stream over.
      contentLength: asset.sizeBytes,
      filename: basename(asset.customerFilename),
      mimeType: asset.mimeType,
    });
  }
}

function createUnauthenticatedResponse(): Response {
  return Response.json(
    { error: "unauthenticated" },
    { headers: PRIVATE_RESPONSE_HEADERS, status: 401 },
  );
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
